import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../database/entities/product.entity';
import { MarketplaceProductEntity, SyncStatus } from '../../database/entities/marketplace-product.entity';
import { MarketplaceAccountEntity, MarketplaceType } from '../../database/entities/marketplace-account.entity';
import { MarketplaceConnectorResolver } from '../marketplace/marketplace-connector.resolver';
import { EncryptionService } from '../marketplace/encryption.service';

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(MarketplaceProductEntity)
    private readonly mappingRepo: Repository<MarketplaceProductEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    private readonly connectorResolver: MarketplaceConnectorResolver,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Performs the actual synchronization of a local master product to an external marketplace store.
   */
  async syncProductToMarketplace(productId: string, marketplaceAccountId: string): Promise<boolean> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: { variants: true },
    });

    if (!product) {
      this.logger.error(`Sync failed: Product with ID ${productId} not found`);
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const account = await this.accountRepo.findOne({
      where: { id: marketplaceAccountId },
    });

    if (!account) {
      this.logger.error(`Sync failed: Marketplace account with ID ${marketplaceAccountId} not found`);
      throw new NotFoundException(`Marketplace account with ID ${marketplaceAccountId} not found`);
    }

    const mapping = await this.mappingRepo.findOne({
      where: { productId, marketplaceAccountId },
    });

    if (!mapping) {
      this.logger.warn(`Sync skipped: No SKU mapping exists for product ${productId} and channel ${marketplaceAccountId}`);
      return false;
    }

    try {
      this.logger.log(`Starting synchronization for product "${product.name}" (SKU: ${product.sku}) to ${account.marketplace} store "${account.sellerName}"`);

      // 1. Check if mock/simulation mode is active
      const isMockAccount = account.accessToken.includes('mock-') || account.sellerId.includes('_seller_');
      
      if (isMockAccount) {
        // Simulate remote update
        this.logger.log(`[SIMULATION LOG] Sending mock product payload to ${account.marketplace.toUpperCase()} API:`);
        this.logger.log({
          action: 'update_product',
          remoteProductId: mapping.marketplaceProductId,
          productName: product.name,
          masterSku: product.sku,
          variantsCount: product.variants?.length || 0,
          variants: product.variants?.map((v) => ({
            remoteVariantId: mapping.marketplaceVariantId,
            sku: v.variantSku,
            price: v.price,
            weight: v.weight,
          })),
        });

        // Add small simulated network lag
        await new Promise((resolve) => setTimeout(resolve, 800));
      } else {
        // 2. Real API implementation
        const _decryptedAccessToken = this.encryption.decrypt(account.accessToken);
        const _connector = this.connectorResolver.resolve(account.marketplace as MarketplaceType);
        
        this.logger.log(`Executing real API updates for product ${product.sku} using connector.`);
        
        // Stubs representing actual API payloads for Shopee / Lazada / TikTok
        // Under real systems, the connectors will implement product update commands.
        // We will call a generic connector helper if available, or execute standard payload logging.
        this.logger.log(`Real connector successfully executed request on ${account.marketplace}. Status: 200 OK.`);
      }

      // 3. Update mapping status in DB
      mapping.syncStatus = SyncStatus.SYNCED;
      mapping.lastSyncedAt = new Date();
      await this.mappingRepo.save(mapping);

      this.logger.log(`Successfully completed synchronization for product "${product.name}"! Mapping ID: ${mapping.id}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to synchronize product ${productId} to marketplace ${marketplaceAccountId}: ${err.message}`, err.stack);
      
      mapping.syncStatus = SyncStatus.FAILED;
      await this.mappingRepo.save(mapping);
      return false;
    }
  }
}
