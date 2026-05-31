import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MarketplaceService } from './marketplace.service';
import {
  MarketplaceAccountEntity,
  MarketplaceType,
  AccountStatus,
} from '../../database/entities/marketplace-account.entity';
import { OAuthStateEntity } from '../../database/entities/oauth-state.entity';
import { EncryptionService } from './encryption.service';
import { MarketplaceConnectorResolver } from './marketplace-connector.resolver';
import { IMarketplaceConnector } from './interfaces/marketplace-connector.interface';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let accountRepo: jest.Mocked<Repository<MarketplaceAccountEntity>>;
  let stateRepo: jest.Mocked<Repository<OAuthStateEntity>>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let _resolver: jest.Mocked<MarketplaceConnectorResolver>;

  const mockConnector: jest.Mocked<IMarketplaceConnector> = {
    getAuthorizationUrl: jest.fn((state) => `https://mock.url?state=${state}`),
    exchangeCodeForTokens: jest.fn().mockResolvedValue({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      expiresIn: 3600,
      sellerId: 'seller_123',
      sellerName: 'Mock Seller',
    }),
    refreshTokens: jest.fn().mockResolvedValue({
      accessToken: 'refreshed-access',
      refreshToken: 'refreshed-refresh',
      expiresIn: 3600,
      sellerId: 'seller_123',
      sellerName: 'Mock Seller Refreshed',
    }),
    getAccountHealth: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const mockAccountRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'acc_uuid', ...entity })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn(),
    };

    const mockStateRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'state_uuid', ...entity })),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockEncryption = {
      encrypt: jest.fn((text) => `encrypted:${text}`),
      decrypt: jest.fn((text) => text.replace('encrypted:', '')),
    };

    const mockResolver = {
      resolve: jest.fn().mockReturnValue(mockConnector),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        {
          provide: getRepositoryToken(MarketplaceAccountEntity),
          useValue: mockAccountRepo,
        },
        {
          provide: getRepositoryToken(OAuthStateEntity),
          useValue: mockStateRepo,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryption,
        },
        {
          provide: MarketplaceConnectorResolver,
          useValue: mockResolver,
        },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    accountRepo = module.get(getRepositoryToken(MarketplaceAccountEntity));
    stateRepo = module.get(getRepositoryToken(OAuthStateEntity));
    encryptionService = module.get(EncryptionService) as any;
    resolver = module.get(MarketplaceConnectorResolver) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should successfully create oauth state and return redirected url', async () => {
      const result = await service.connect('tiktok', 'user_id');

      expect(result.url).toContain('https://mock.url?state=');
      expect(result.state).toBeDefined();
      expect(stateRepo.create).toHaveBeenCalled();
      expect(stateRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if marketplace is unsupported', async () => {
      await expect(service.connect('amazon', 'user_id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleCallback', () => {
    it('should throw BadRequestException if state is invalid/not found', async () => {
      stateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.handleCallback('code123', 'state123', 'user123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if state has expired', async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 1); // 1 minute in the past
      stateRecord = {
        id: 'state_uuid',
        state: 'expired_state',
        marketplace: 'tiktok',
        expiredAt: expiredDate,
        createdAt: new Date(),
      };
      stateRepo.findOne.mockResolvedValue(stateRecord);

      await expect(
        service.handleCallback('code123', 'expired_state', 'user123'),
      ).rejects.toThrow(BadRequestException);
      expect(stateRepo.remove).toHaveBeenCalledWith(stateRecord);
    });

    let stateRecord: OAuthStateEntity;

    it('should exchange auth code, encrypt, and save marketplace account successfully', async () => {
      const validDate = new Date();
      validDate.setMinutes(validDate.getMinutes() + 5);
      stateRecord = {
        id: 'state_uuid',
        state: 'valid_state',
        marketplace: 'tiktok',
        expiredAt: validDate,
        createdAt: new Date(),
      };
      stateRepo.findOne.mockResolvedValue(stateRecord);
      accountRepo.findOne.mockResolvedValue(null);

      const result = await service.handleCallback('authcode123', 'valid_state', 'user123');

      expect(result.marketplace).toBe(MarketplaceType.TIKTOK);
      expect(result.sellerId).toBe('seller_123');
      expect(mockConnector.exchangeCodeForTokens).toHaveBeenCalledWith('authcode123');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('fresh-access');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('fresh-refresh');
      expect(accountRepo.save).toHaveBeenCalled();
      expect(stateRepo.remove).toHaveBeenCalledWith(stateRecord);
    });
  });

  describe('getConnectedAccounts', () => {
    it('should return connected accounts while omitting tokens', async () => {
      const accountMock = {
        id: 'acc1',
        marketplace: MarketplaceType.TIKTOK,
        sellerId: 'seller1',
        sellerName: 'My Store',
        accessToken: 'encrypted:token1',
        refreshToken: 'encrypted:token2',
        tokenExpiredAt: new Date(),
        status: AccountStatus.ACTIVE,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        creator: null,
      };
      accountRepo.find.mockResolvedValue([accountMock] as any);

      const result = await service.getConnectedAccounts();

      expect(result[0].accessToken).toBeUndefined();
      expect(result[0].refreshToken).toBeUndefined();
      expect(result[0].sellerId).toBe('seller1');
    });
  });

  describe('refreshAccountTokens', () => {
    it('should retrieve existing account, decrypt, refresh, encrypt and save', async () => {
      const accountMock = {
        id: 'acc1',
        marketplace: MarketplaceType.LAZADA,
        sellerId: 'lz1',
        sellerName: 'Lazada Store',
        accessToken: 'encrypted:old-access',
        refreshToken: 'encrypted:old-refresh',
        tokenExpiredAt: new Date(),
        status: AccountStatus.ACTIVE,
      };
      accountRepo.findOne.mockResolvedValue(accountMock as any);

      const result = await service.refreshAccountTokens('acc1');

      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted:old-refresh');
      expect(mockConnector.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('refreshed-access');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('refreshed-refresh');
      expect(accountRepo.save).toHaveBeenCalled();
      expect(result.accessToken).toBeUndefined();
    });

    it('should throw NotFoundException if account does not exist', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshAccountTokens('acc_missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('disconnectAccount', () => {
    it('should set status to disconnected and soft-delete connection', async () => {
      const accountMock = {
        id: 'acc1',
        marketplace: MarketplaceType.SHOPEE,
        status: AccountStatus.ACTIVE,
      };
      accountRepo.findOne.mockResolvedValue(accountMock as any);

      await service.disconnectAccount('acc1');

      expect(accountMock.status).toBe(AccountStatus.DISCONNECTED);
      expect(accountRepo.save).toHaveBeenCalledWith(accountMock);
      expect(accountRepo.softDelete).toHaveBeenCalledWith('acc1');
    });
  });

  describe('getAccountHealth', () => {
    it('should decrypt tokens, query connector and update health status', async () => {
      const accountMock = {
        id: 'acc1',
        marketplace: MarketplaceType.TIKTOK,
        accessToken: 'encrypted:access',
        status: AccountStatus.ACTIVE,
      };
      accountRepo.findOne.mockResolvedValue(accountMock as any);
      mockConnector.getAccountHealth.mockResolvedValue(true);

      const result = await service.getAccountHealth('acc1');

      expect(result.active).toBe(true);
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted:access');
      expect(mockConnector.getAccountHealth).toHaveBeenCalledWith('access');
    });

    it('should flag account status as EXPIRED if health check returns false', async () => {
      const accountMock = {
        id: 'acc1',
        marketplace: MarketplaceType.TIKTOK,
        accessToken: 'encrypted:access',
        status: AccountStatus.ACTIVE,
      };
      accountRepo.findOne.mockResolvedValue(accountMock as any);
      mockConnector.getAccountHealth.mockResolvedValue(false);

      const result = await service.getAccountHealth('acc1');

      expect(result.active).toBe(false);
      expect(accountMock.status).toBe(AccountStatus.EXPIRED);
      expect(accountRepo.save).toHaveBeenCalledWith(accountMock);
    });
  });

  describe('checkTokenExpirations', () => {
    it('should identify active expired accounts, update status, and return count', async () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 10000);
      const healthyDate = new Date(now.getTime() + 10000);

      const accounts = [
        { id: 'acc1', status: AccountStatus.ACTIVE, tokenExpiredAt: expiredDate },
        { id: 'acc2', status: AccountStatus.ACTIVE, tokenExpiredAt: healthyDate },
      ];

      accountRepo.find.mockResolvedValue(accounts as any);

      const result = await service.checkTokenExpirations();

      expect(result.updatedCount).toBe(1);
      expect(accounts[0].status).toBe(AccountStatus.EXPIRED);
      expect(accounts[1].status).toBe(AccountStatus.ACTIVE);
      expect(accountRepo.save).toHaveBeenCalledWith(accounts[0]);
    });
  });

  describe('checkAllAccountsHealth', () => {
    it('should iterate active and expired accounts and call getAccountHealth', async () => {
      const accounts = [
        { id: 'acc1', marketplace: MarketplaceType.TIKTOK, status: AccountStatus.ACTIVE, accessToken: 'encrypted:access' },
        { id: 'acc2', marketplace: MarketplaceType.LAZADA, status: AccountStatus.EXPIRED, accessToken: 'encrypted:access' },
      ];
      accountRepo.find.mockResolvedValue(accounts as any);
      
      accountRepo.findOne.mockImplementation(({ where }: any) => {
        const match = accounts.find(a => a.id === where.id);
        return Promise.resolve(match as any);
      });

      mockConnector.getAccountHealth.mockResolvedValueOnce(true);
      mockConnector.getAccountHealth.mockResolvedValueOnce(false);

      const result = await service.checkAllAccountsHealth();

      expect(result.checkedCount).toBe(2);
      expect(result.unhealthyCount).toBe(1);
    });
  });

  describe('getConnectedAccounts auto-expiration', () => {
    it('should automatically flag and update expired accounts in line', async () => {
      const expiredDate = new Date(Date.now() - 5000);
      const accountMock = {
        id: 'acc1',
        marketplace: MarketplaceType.TIKTOK,
        sellerId: 'seller1',
        accessToken: 'encrypted:token1',
        status: AccountStatus.ACTIVE,
        tokenExpiredAt: expiredDate,
      };
      accountRepo.find.mockResolvedValue([accountMock] as any);

      await service.getConnectedAccounts();

      expect(accountMock.status).toBe(AccountStatus.EXPIRED);
      expect(accountRepo.save).toHaveBeenCalledWith(accountMock);
    });
  });

  describe('handleDeauthorization', () => {
    it('should set disconnected and soft-delete store if match is found', async () => {
      const accountMock = {
        id: 'acc_deauth',
        marketplace: MarketplaceType.TIKTOK,
        sellerId: 'my_seller',
        status: AccountStatus.ACTIVE,
      };
      accountRepo.findOne.mockResolvedValue(accountMock as any);

      await service.handleDeauthorization('tiktok', 'my_seller');

      expect(accountMock.status).toBe(AccountStatus.DISCONNECTED);
      expect(accountRepo.save).toHaveBeenCalledWith(accountMock);
      expect(accountRepo.softDelete).toHaveBeenCalledWith('acc_deauth');
    });
  });
});
