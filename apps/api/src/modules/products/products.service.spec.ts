import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { ProductEntity, ProductStatus } from '../../database/entities/product.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { MarketplaceProductEntity, SyncStatus } from '../../database/entities/marketplace-product.entity';
import { ProductSyncQueueService } from './product-sync-queue.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: jest.Mocked<Repository<ProductEntity>>;
  let variantRepo: jest.Mocked<Repository<ProductVariantEntity>>;
  let mappingRepo: jest.Mocked<Repository<MarketplaceProductEntity>>;
  let syncQueue: jest.Mocked<ProductSyncQueueService>;

  beforeEach(async () => {
    const mockProductRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'prod_uuid', ...entity })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
      softRemove: jest.fn().mockResolvedValue(true),
    };

    const mockVariantRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => {
        if (Array.isArray(entity)) {
          return Promise.resolve(entity.map((e) => ({ id: 'var_uuid', ...e })));
        }
        return Promise.resolve({ id: 'var_uuid', ...entity });
      }),
      findOne: jest.fn(),
    };

    const mockMappingRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'map_uuid', ...entity })),
      findOne: jest.fn(),
    };

    const mockSyncQueue = {
      addSyncJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(ProductVariantEntity),
          useValue: mockVariantRepo,
        },
        {
          provide: getRepositoryToken(MarketplaceProductEntity),
          useValue: mockMappingRepo,
        },
        {
          provide: ProductSyncQueueService,
          useValue: mockSyncQueue,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get(getRepositoryToken(ProductEntity));
    variantRepo = module.get(getRepositoryToken(ProductVariantEntity));
    mappingRepo = module.get(getRepositoryToken(MarketplaceProductEntity));
    syncQueue = module.get(ProductSyncQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should successfully create a master product and nested variants', async () => {
      productRepo.findOne.mockResolvedValue(null);
      productRepo.findOne.mockImplementationOnce(() => null); // for exists check
      
      const mockProduct = {
        id: 'prod_uuid',
        sku: 'M-SKU-1',
        name: 'Master Product 1',
        variants: [{ id: 'var_uuid', variantName: 'Red', variantSku: 'V-SKU-1' }],
        mappings: [],
      };
      
      productRepo.findOne.mockResolvedValueOnce(mockProduct as any); // for findOne return

      const result = await service.createProduct({
        sku: 'M-SKU-1',
        name: 'Master Product 1',
        variants: [{ variantName: 'Red', variantSku: 'V-SKU-1', price: 100 }],
      });

      expect(productRepo.create).toHaveBeenCalled();
      expect(variantRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('prod_uuid');
      expect(result.sku).toBe('M-SKU-1');
    });

    it('should throw BadRequestException if master SKU already exists', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.createProduct({
          sku: 'M-SKU-1',
          name: 'Master Product 1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if product is missing', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing_id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrUpdateMapping', () => {
    it('should create mapping and dispatch sync job successfully', async () => {
      const mockProduct = { id: 'prod_uuid', sku: 'M-SKU-1', name: 'Master Product 1', mappings: [] };
      productRepo.findOne.mockResolvedValue(mockProduct as any);
      mappingRepo.findOne.mockResolvedValue(null);

      const result = await service.createOrUpdateMapping({
        productId: 'prod_uuid',
        marketplaceAccountId: 'acc_uuid',
        marketplaceProductId: 'remote_123',
        marketplaceVariantId: 'remote_v_123',
      });

      expect(mappingRepo.create).toHaveBeenCalled();
      expect(mappingRepo.save).toHaveBeenCalled();
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('prod_uuid', 'acc_uuid');
      expect(result.syncStatus).toBe(SyncStatus.PENDING);
    });
  });

  describe('triggerProductSync', () => {
    it('should enqueue sync jobs for all mapped marketplace channels', async () => {
      const mockProduct = {
        id: 'prod_uuid',
        sku: 'M-SKU-1',
        name: 'Master Product 1',
        mappings: [
          { marketplaceAccountId: 'acc1', syncStatus: SyncStatus.SYNCED },
          { marketplaceAccountId: 'acc2', syncStatus: SyncStatus.SYNCED },
        ],
      };
      productRepo.findOne.mockResolvedValue(mockProduct as any);

      await service.triggerProductSync('prod_uuid');

      expect(syncQueue.addSyncJob).toHaveBeenCalledTimes(2);
      expect(syncQueue.addSyncJob).toHaveBeenNthCalledWith(1, 'prod_uuid', 'acc1');
      expect(syncQueue.addSyncJob).toHaveBeenNthCalledWith(2, 'prod_uuid', 'acc2');
    });
  });
});
