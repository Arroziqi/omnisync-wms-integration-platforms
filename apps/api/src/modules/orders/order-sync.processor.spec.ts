import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { OrderSyncProcessor, OrderSyncJobData } from './order-sync.processor';
import { OrderSyncService } from './order-sync.service';
import { ApiQuotaManagerService } from '../queue/api-quota-manager.service';
import { SyncJobEntity, SyncJobStatus } from '../../database/entities/sync-job.entity';
import { FailedJobEntity, FailedJobStatus } from '../../database/entities/failed-job.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { NotificationService } from '../notifications/notification.service';

const mockOrderSyncService = {
  syncOrdersForAccount: jest.fn(),
};

const mockQuotaManager = {
  waitForSlot: jest.fn().mockResolvedValue(undefined),
};

const mockSyncJobRepo = {
  update: jest.fn(),
};

const mockFailedJobRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockAccountRepo = {
  findOne: jest.fn(),
};

const buildMockJob = (
  data: OrderSyncJobData,
  overrides: Partial<Job> = {},
): Job<OrderSyncJobData> =>
  ({
    id: 'bull-job-001',
    data,
    attemptsMade: 0,
    opts: { attempts: 5 },
    ...overrides,
  } as unknown as Job<OrderSyncJobData>);

describe('OrderSyncProcessor', () => {
  let processor: OrderSyncProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue({}),
      sendDlqAlert: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderSyncProcessor,
        { provide: OrderSyncService, useValue: mockOrderSyncService },
        { provide: ApiQuotaManagerService, useValue: mockQuotaManager },
        { provide: getRepositoryToken(SyncJobEntity), useValue: mockSyncJobRepo },
        { provide: getRepositoryToken(FailedJobEntity), useValue: mockFailedJobRepo },
        { provide: getRepositoryToken(MarketplaceAccountEntity), useValue: mockAccountRepo },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    processor = module.get<OrderSyncProcessor>(OrderSyncProcessor);
  });

  describe('process()', () => {
    it('should complete successfully and update sync job status', async () => {
      const jobData: OrderSyncJobData = {
        accountId: 'acc-uuid-1',
        orderNumber: 'ORD-123',
        marketplace: 'tiktok',
        syncJobId: 'sync-job-uuid-1',
      };

      mockOrderSyncService.syncOrdersForAccount.mockResolvedValue(true);
      mockSyncJobRepo.update.mockResolvedValue(undefined);

      const job = buildMockJob(jobData);
      const result = await processor.process(job);

      expect(result).toBe(true);
      expect(mockQuotaManager.waitForSlot).toHaveBeenCalledWith('tiktok');
      expect(mockOrderSyncService.syncOrdersForAccount).toHaveBeenCalledWith(
        'acc-uuid-1',
        'ORD-123',
      );
      // Should update sync job to COMPLETED
      expect(mockSyncJobRepo.update).toHaveBeenLastCalledWith(
        { id: 'sync-job-uuid-1' },
        expect.objectContaining({ status: SyncJobStatus.COMPLETED }),
      );
    });

    it('should set sync job to ACTIVE on first attempt', async () => {
      const jobData: OrderSyncJobData = {
        accountId: 'acc-uuid-2',
        orderNumber: 'ORD-456',
        marketplace: 'shopee',
        syncJobId: 'sync-job-uuid-2',
      };

      mockOrderSyncService.syncOrdersForAccount.mockResolvedValue(true);
      mockSyncJobRepo.update.mockResolvedValue(undefined);

      const job = buildMockJob(jobData, { attemptsMade: 0 });
      await processor.process(job);

      // First call: set to ACTIVE
      expect(mockSyncJobRepo.update).toHaveBeenCalledWith(
        { id: 'sync-job-uuid-2' },
        { status: SyncJobStatus.ACTIVE, bullJobId: 'bull-job-001' },
      );
    });

    it('should throw when syncOrdersForAccount returns false', async () => {
      mockOrderSyncService.syncOrdersForAccount.mockResolvedValue(false);

      const job = buildMockJob({
        accountId: 'acc-uuid-3',
        marketplace: 'lazada',
      });

      await expect(processor.process(job)).rejects.toThrow(
        'syncOrdersForAccount returned false',
      );
    });

    it('should enforce quota before syncing', async () => {
      mockOrderSyncService.syncOrdersForAccount.mockResolvedValue(true);
      mockSyncJobRepo.update.mockResolvedValue(undefined);

      const job = buildMockJob({ accountId: 'acc-uuid-4', marketplace: 'shopee' });
      await processor.process(job);

      expect(mockQuotaManager.waitForSlot).toHaveBeenCalledWith('shopee');
    });

    it('should resolve marketplace from account repo if not in job data', async () => {
      mockAccountRepo.findOne.mockResolvedValue({ marketplace: 'tiktok' });
      mockOrderSyncService.syncOrdersForAccount.mockResolvedValue(true);
      mockSyncJobRepo.update.mockResolvedValue(undefined);

      const job = buildMockJob({ accountId: 'acc-uuid-5' }); // no marketplace in data
      await processor.process(job);

      expect(mockAccountRepo.findOne).toHaveBeenCalled();
      expect(mockQuotaManager.waitForSlot).toHaveBeenCalledWith('tiktok');
    });
  });

  describe('onFailed()', () => {
    it('should write DLQ record and update sync job on final failure', async () => {
      const jobData: OrderSyncJobData = {
        accountId: 'acc-uuid-6',
        orderNumber: 'ORD-DEAD',
        marketplace: 'lazada',
        syncJobId: 'sync-job-uuid-dead',
      };

      const job = buildMockJob(jobData, {
        attemptsMade: 5,
        opts: { attempts: 5 },
      });

      const mockDlqRecord = { id: 'dlq-uuid-1' };
      mockFailedJobRepo.create.mockReturnValue(mockDlqRecord);
      mockFailedJobRepo.save.mockResolvedValue(mockDlqRecord);
      mockSyncJobRepo.update.mockResolvedValue(undefined);

      await processor.onFailed(job, new Error('Marketplace API timeout'));

      expect(mockFailedJobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          marketplaceAccountId: 'acc-uuid-6',
          orderNumber: 'ORD-DEAD',
          marketplace: 'lazada',
          status: FailedJobStatus.DEAD,
          finalError: 'Marketplace API timeout',
        }),
      );
      expect(mockFailedJobRepo.save).toHaveBeenCalledWith(mockDlqRecord);
      expect(mockSyncJobRepo.update).toHaveBeenCalledWith(
        { id: 'sync-job-uuid-dead' },
        expect.objectContaining({ status: SyncJobStatus.DEAD }),
      );
    });

    it('should NOT write DLQ record if retries remain', async () => {
      const job = buildMockJob(
        { accountId: 'acc-uuid-7', marketplace: 'tiktok' },
        { attemptsMade: 2, opts: { attempts: 5 } },
      );

      await processor.onFailed(job, new Error('transient error'));

      // No DLQ record should be written for intermediate failures
      expect(mockFailedJobRepo.create).not.toHaveBeenCalled();
    });
  });
});
