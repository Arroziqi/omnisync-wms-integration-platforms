import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductSyncService } from './product-sync.service';
import { ProductEntity } from '../../database/entities/product.entity';
import { MarketplaceProductEntity, SyncStatus } from '../../database/entities/marketplace-product.entity';
import { MarketplaceAccountEntity, AccountStatus, MarketplaceType } from '../../database/entities/marketplace-account.entity';
import { MarketplaceConnectorResolver } from '../marketplace/marketplace-connector.resolver';
import { EncryptionService } from '../marketplace/encryption.service';

describe('ProductSyncService', () => {
  let service: ProductSyncService;
  let productRepo: jest.Mocked<Repository<ProductEntity>>;
  let mappingRepo: jest.Mocked<Repository<MarketplaceProductEntity>>;
  let accountRepo: jest.Mocked<Repository<MarketplaceAccountEntity>>;
  let _resolver: jest.Mocked<MarketplaceConnectorResolver>;
  let _encryption: jest.Mocked<EncryptionService>;

  beforeEach(async () => {
    const mockProductRepo = {
      findOne: jest.fn(),
    };

    const mockMappingRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    const mockAccountRepo = {
      findOne: jest.fn(),
    };

    const mockResolver = {
      resolve: jest.fn().mockReturnValue({
        getAccountHealth: jest.fn().mockResolvedValue(true),
      }),
    };

    const mockEncryption = {
      encrypt: jest.fn((t) => t),
      decrypt: jest.fn((t) => t),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSyncService,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(MarketplaceProductEntity),
          useValue: mockMappingRepo,
        },
        {
          provide: getRepositoryToken(MarketplaceAccountEntity),
          useValue: mockAccountRepo,
        },
        {
          provide: MarketplaceConnectorResolver,
          useValue: mockResolver,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryption,
        },
      ],
    }).compile();

    service = module.get<ProductSyncService>(ProductSyncService);
    productRepo = module.get(getRepositoryToken(ProductEntity));
    mappingRepo = module.get(getRepositoryToken(MarketplaceProductEntity));
    accountRepo = module.get(getRepositoryToken(MarketplaceAccountEntity));
    resolver = module.get(MarketplaceConnectorResolver);
    encryption = module.get(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncProductToMarketplace', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.syncProductToMarketplace('missing_prod', 'acc')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should simulate synchronization successfully under mock mode', async () => {
      const mockProduct = { id: 'prod_1', sku: 'S1', name: 'Prod 1', variants: [] };
      const mockAccount = {
        id: 'acc_1',
        marketplace: MarketplaceType.SHOPEE,
        sellerId: 'shopee_seller_123',
        sellerName: 'Shopee Mock',
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        status: AccountStatus.ACTIVE,
      };
      const mockMapping = {
        id: 'map_1',
        productId: 'prod_1',
        marketplaceAccountId: 'acc_1',
        marketplaceProductId: 'remote_1',
        marketplaceVariantId: null,
        syncStatus: SyncStatus.PENDING,
      };

      productRepo.findOne.mockResolvedValue(mockProduct as any);
      accountRepo.findOne.mockResolvedValue(mockAccount as any);
      mappingRepo.findOne.mockResolvedValue(mockMapping as any);

      const result = await service.syncProductToMarketplace('prod_1', 'acc_1');

      expect(result).toBe(true);
      expect(mockMapping.syncStatus).toBe(SyncStatus.SYNCED);
      expect(mappingRepo.save).toHaveBeenCalledWith(mockMapping);
    });
  });
});
