import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookService } from './webhook.service';
import { WebhookEventEntity, WebhookEventStatus, WebhookEventType } from '../../database/entities/webhook-event.entity';
import { WebhookDeliveryLogEntity, DeliveryLogStatus } from '../../database/entities/webhook-delivery-log.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { OrderSyncQueueService } from '../orders/order-sync-queue.service';
import { NotificationService } from '../notifications/notification.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookEventRepo: jest.Mocked<Repository<WebhookEventEntity>>;
  let deliveryLogRepo: jest.Mocked<Repository<WebhookDeliveryLogEntity>>;
  let accountRepo: jest.Mocked<Repository<MarketplaceAccountEntity>>;
  let syncQueue: jest.Mocked<OrderSyncQueueService>;

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'generated-id', ...entity })),
      softDelete: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    });

    const mockSyncQueue = {
      addSyncJob: jest.fn(),
    };

    const mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: getRepositoryToken(WebhookEventEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(WebhookDeliveryLogEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(MarketplaceAccountEntity), useFactory: mockRepo },
        { provide: OrderSyncQueueService, useValue: mockSyncQueue },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    webhookEventRepo = module.get(getRepositoryToken(WebhookEventEntity));
    deliveryLogRepo = module.get(getRepositoryToken(WebhookDeliveryLogEntity));
    accountRepo = module.get(getRepositoryToken(MarketplaceAccountEntity));
    syncQueue = module.get(OrderSyncQueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────────
  // Signature Validation
  // ───────────────────────────────────────────────────────────────
  describe('validateSignature', () => {
    it('should return true in simulation mode when no signature provided', () => {
      const result = service.validateSignature('tiktok', '{"test":1}', 'simulated');
      expect(result).toBe(true);
    });

    it('should return true in simulation mode when empty signature provided', () => {
      const result = service.validateSignature('shopee', '{}', '');
      expect(result).toBe(true);
    });

    it('should return false for invalid HMAC signature', () => {
      const result = service.validateSignature('tiktok', '{"order_id":"test"}', 'invalid-sig-hash');
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Replay Attack Prevention
  // ───────────────────────────────────────────────────────────────
  describe('processWebhook — replay attack prevention', () => {
    it('should reject a webhook with a timestamp older than 5 minutes', async () => {
      const oldTimestamp = Math.floor((Date.now() - 400000) / 1000); // 6+ minutes ago
      const stalePayload = {
        type: 'order_create',
        shop_id: 'test_seller',
        timestamp: oldTimestamp,
        message_id: `old_${Date.now()}`,
        data: { order_id: 'ORD-STALE' },
      };

      await expect(
        service.processWebhook({
          marketplace: 'tiktok',
          rawBody: JSON.stringify(stalePayload),
          signatureHeader: 'simulated',
          payload: stalePayload,
        }),
      ).rejects.toThrow('replay attack prevention');
    });

    it('should accept a webhook with a fresh timestamp', async () => {
      const freshTimestamp = Math.floor(Date.now() / 1000);
      const freshPayload = {
        type: 'order_create',
        shop_id: 'test_seller',
        timestamp: freshTimestamp,
        message_id: `fresh_${Date.now()}`,
        data: { order_id: 'ORD-FRESH' },
      };

      accountRepo.findOne.mockResolvedValue({
        id: 'acc_id',
        marketplace: 'tiktok',
        sellerId: 'test_seller',
        status: 'active',
      } as any);

      const result = await service.processWebhook({
        marketplace: 'tiktok',
        rawBody: JSON.stringify(freshPayload),
        signatureHeader: 'simulated',
        payload: freshPayload,
      });

      expect(result.received).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Duplicate Event Prevention (Idempotency)
  // ───────────────────────────────────────────────────────────────
  describe('processWebhook — duplicate event prevention', () => {
    it('should gracefully ignore duplicate events with the same idempotency key', async () => {
      const { QueryFailedError } = await import('typeorm');
      const dupError = new QueryFailedError('INSERT', [], new Error('duplicate key'));
      webhookEventRepo.save.mockRejectedValueOnce(dupError);

      const payload = {
        type: 'order_create',
        shop_id: 'seller_1',
        message_id: 'duplicate_event_id',
        data: { order_id: 'ORD-DUP' },
      };

      const result = await service.processWebhook({
        marketplace: 'tiktok',
        rawBody: JSON.stringify(payload),
        signatureHeader: 'simulated',
        payload,
      });

      expect(result.received).toBe(true);
      expect(result.message).toContain('Duplicate event ignored');
      expect(syncQueue.addSyncJob).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // State Transition Safeguards
  // ───────────────────────────────────────────────────────────────
  describe('processWebhook — state transition safeguards', () => {
    it('should ignore order events from accounts with inactive status', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'acc_id',
        marketplace: 'shopee',
        sellerId: 'shopee_seller',
        status: 'expired',
      } as any);

      const payload = {
        type: 'ORDER_CREATE',
        shop_id: 'shopee_seller',
        message_id: `inact_${Date.now()}`,
        data: { order_id: 'ORD-INACTIVE' },
      };

      const result = await service.processWebhook({
        marketplace: 'shopee',
        rawBody: JSON.stringify(payload),
        signatureHeader: 'simulated',
        payload,
      });

      expect(result.received).toBe(true);
      expect(syncQueue.addSyncJob).not.toHaveBeenCalled();
    });

    it('should ignore order events when no matching marketplace account exists', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      const payload = {
        type: 'order_create',
        shop_id: 'unknown_seller',
        message_id: `noacc_${Date.now()}`,
        data: { order_id: 'ORD-NO-ACC' },
      };

      const result = await service.processWebhook({
        marketplace: 'lazada',
        rawBody: JSON.stringify(payload),
        signatureHeader: 'simulated',
        payload,
      });

      expect(result.received).toBe(true);
      expect(syncQueue.addSyncJob).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Queue Publisher
  // ───────────────────────────────────────────────────────────────
  describe('processWebhook — queue publisher', () => {
    it('should enqueue order sync job for a valid order_create event', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'acc_id',
        marketplace: 'tiktok',
        sellerId: 'shop_active',
        status: 'active',
      } as any);

      const orderNum = 'TK-2026-123456';
      const payload = {
        type: 'order_create',
        shop_id: 'shop_active',
        message_id: `enqueue_${Date.now()}`,
        data: { order_id: orderNum },
      };

      const result = await service.processWebhook({
        marketplace: 'tiktok',
        rawBody: JSON.stringify(payload),
        signatureHeader: 'simulated',
        payload,
      });

      expect(result.received).toBe(true);
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('acc_id', orderNum);
    });

    it('should handle shop_deauthorized events by disconnecting the account', async () => {
      const mockAccount = {
        id: 'acc_deauth',
        marketplace: 'shopee',
        sellerId: 'deauth_seller',
        status: 'active',
      } as any;

      accountRepo.findOne.mockResolvedValue(mockAccount);

      const payload = {
        type: 'shop_deauthorized',
        shop_id: 'deauth_seller',
        message_id: `deauth_${Date.now()}`,
      };

      const result = await service.processWebhook({
        marketplace: 'shopee',
        rawBody: JSON.stringify(payload),
        signatureHeader: 'simulated',
        payload,
      });

      expect(result.received).toBe(true);
      expect(accountRepo.save).toHaveBeenCalled();
      expect(syncQueue.addSyncJob).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Monitoring APIs
  // ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated webhook events', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
      expect(webhookEventRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findDeliveryLogs', () => {
    it('should return delivery logs for a specific webhook event', async () => {
      deliveryLogRepo.find.mockResolvedValue([]);
      const result = await service.findDeliveryLogs('event-id');
      expect(result).toEqual([]);
      expect(deliveryLogRepo.find).toHaveBeenCalledWith({
        where: { webhookEventId: 'event-id' },
        order: { createdAt: 'ASC' },
      });
    });
  });
});
