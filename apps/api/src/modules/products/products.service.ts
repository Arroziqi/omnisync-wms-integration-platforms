import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../database/entities/product.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { MarketplaceProductEntity, SyncStatus } from '../../database/entities/marketplace-product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-variant.dto';
import { UpdateProductVariantDto } from './dto/update-variant.dto';
import { ConnectMarketplaceProductDto } from './dto/connect-marketplace-product.dto';
import { ProductSyncQueueService } from './product-sync-queue.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    @InjectRepository(MarketplaceProductEntity)
    private readonly mappingRepo: Repository<MarketplaceProductEntity>,
    private readonly syncQueue: ProductSyncQueueService,
  ) {}

  /**
   * Creates a new master product and its inline variants.
   */
  async createProduct(dto: CreateProductDto): Promise<ProductEntity> {
    // Check if master SKU already exists
    const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${dto.sku}" already exists`);
    }

    const product = this.productRepo.create({
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      brand: dto.brand,
      status: dto.status,
    });

    const savedProduct = await this.productRepo.save(product);

    if (dto.variants && dto.variants.length > 0) {
      const variantsToCreate = dto.variants.map((v) => {
        return this.variantRepo.create({
          productId: savedProduct.id,
          variantName: v.variantName,
          variantSku: v.variantSku,
          price: v.price || 0,
          currency: v.currency || 'USD',
          weight: v.weight || 0,
        });
      });
      await this.variantRepo.save(variantsToCreate);
    }

    return this.findOne(savedProduct.id);
  }

  /**
   * Retrieves all master products, supporting basic filtering and relationships.
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    brand?: string;
  }): Promise<{ data: ProductEntity[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 50)));
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.mappings', 'mappings')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR variants.variantSku ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.category) {
      qb.andWhere('product.category = :category', { category: query.category });
    }

    if (query.brand) {
      qb.andWhere('product.brand = :brand', { brand: query.brand });
    }

    qb.orderBy('product.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves detailed information of a master product.
   */
  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: {
        variants: true,
        mappings: {
          marketplaceAccount: true,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  /**
   * Updates master product details.
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findOne(id);

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (existing) {
        throw new BadRequestException(`Product with SKU "${dto.sku}" already exists`);
      }
    }

    Object.assign(product, dto);
    await this.productRepo.save(product);

    // Auto-enqueue background sync to all mapped channels when product is updated
    await this.triggerProductSync(product.id);

    return this.findOne(product.id);
  }

  /**
   * Soft deletes a master product and all related items cascade.
   */
  async deleteProduct(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepo.softRemove(product);
  }

  /**
   * Creates a variant under an existing master product.
   */
  async createVariant(productId: string, dto: CreateProductVariantDto): Promise<ProductVariantEntity> {
    const product = await this.findOne(productId);

    const existing = await this.variantRepo.findOne({ where: { variantSku: dto.variantSku } });
    if (existing) {
      throw new BadRequestException(`Variant with SKU "${dto.variantSku}" already exists`);
    }

    const variant = this.variantRepo.create({
      productId: product.id,
      variantName: dto.variantName,
      variantSku: dto.variantSku,
      price: dto.price || 0,
      currency: dto.currency || 'USD',
      weight: dto.weight || 0,
    });

    const savedVariant = await this.variantRepo.save(variant);

    // Trigger sync for parent product
    await this.triggerProductSync(product.id);

    return savedVariant;
  }

  /**
   * Updates a specific product variant details.
   */
  async updateVariant(variantId: string, dto: UpdateProductVariantDto): Promise<ProductVariantEntity> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId } });
    if (!variant) {
      throw new NotFoundException(`Product variant with ID "${variantId}" not found`);
    }

    if (dto.variantSku && dto.variantSku !== variant.variantSku) {
      const existing = await this.variantRepo.findOne({ where: { variantSku: dto.variantSku } });
      if (existing) {
        throw new BadRequestException(`Variant with SKU "${dto.variantSku}" already exists`);
      }
    }

    Object.assign(variant, dto);
    const saved = await this.variantRepo.save(variant);

    // Trigger parent sync
    await this.triggerProductSync(variant.productId);

    return saved;
  }

  /**
   * Binds a local master product to an external marketplace listing (SKU mapping).
   */
  async createOrUpdateMapping(dto: ConnectMarketplaceProductDto): Promise<MarketplaceProductEntity> {
    // Validate product exists
    await this.findOne(dto.productId);

    let mapping = await this.mappingRepo.findOne({
      where: {
        marketplaceAccountId: dto.marketplaceAccountId,
        marketplaceProductId: dto.marketplaceProductId,
        marketplaceVariantId: dto.marketplaceVariantId || null,
      },
    });

    if (mapping) {
      // Rebind mapping to new local product ID if requested
      mapping.productId = dto.productId;
      mapping.syncStatus = SyncStatus.PENDING;
    } else {
      // Create new binding
      mapping = this.mappingRepo.create({
        marketplaceAccountId: dto.marketplaceAccountId,
        productId: dto.productId,
        marketplaceProductId: dto.marketplaceProductId,
        marketplaceVariantId: dto.marketplaceVariantId || null,
        syncStatus: SyncStatus.PENDING,
      });
    }

    const savedMapping = await this.mappingRepo.save(mapping);

    // Dispatch background sync job to fetch/push details
    this.syncQueue.addSyncJob(dto.productId, dto.marketplaceAccountId);

    return savedMapping;
  }

  /**
   * Triggers manual synchronization for a product across all its active marketplace channels.
   */
  async triggerProductSync(productId: string): Promise<void> {
    const product = await this.findOne(productId);
    
    if (!product.mappings || product.mappings.length === 0) {
      return;
    }

    for (const mapping of product.mappings) {
      // Mark as pending update in the DB
      mapping.syncStatus = SyncStatus.PENDING;
      await this.mappingRepo.save(mapping);

      // Publish to async processor queue
      this.syncQueue.addSyncJob(product.id, mapping.marketplaceAccountId);
    }
  }
}
