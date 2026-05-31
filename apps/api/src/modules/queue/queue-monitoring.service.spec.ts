import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueueMonitoringService } from './queue-monitoring.service';
import { SyncJobEntity, SyncJobStatus } from '../../database/entities/sync-job.entity';
import { FailedJobEntity, FailedJobStatus } from '../../database/entities/failed-job.entity';
import { ORDER_SYNC_QUEUE } from './queue.constants';

const mockQueue = {
  getJobCounts: jest.fn(),
  getJob: jest.fn(),
};

const mockSyncJobRepo = {
  count: jest.fn(),
  update: jest.fn(),
};

const mockFailedJobRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

describe('QueueMonitoringService', () => {
  let service: QueueMonitoringService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueMonitoringService,
        {
          provide: getQueueToken(ORDER_SYNC_QUEUE),
          useValue: mockQueue,
        },
        {
          provide: getRepositoryToken(SyncJobEntity),
          useValue: mockSyncJobRepo,
        },
        {
          provide: getRepositoryToken(FailedJobEntity),
          useValue: mockFailedJobRepo,
        },
      ],
    }).compile();

    service = module.get<QueueMonitoringService>(QueueMonitoringService);
  });

  describe('getQueueStats', () => {
    it('should return combined BullMQ queue stats and DB counts', async () => {
      // Arrange
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 3,
        active: 2,
        delayed: 1,
        completed: 50,
        failed: 5,
        paused: 0,
      });

      mockSyncJobRepo.count
        .mockResolvedValueOnce(100) // totalSyncJobs
        .mockResolvedValueOnce(80)  // completedJobs
        .mockResolvedValueOnce(15); // failedJobs
      mockFailedJobRepo.count.mockResolvedValue(7); // deadJobs

      // Act
      const result = await service.getQueueStats();

      // Assert
      expect(result.queue.waiting).toBe(3);
      expect(result.queue.active).toBe(2);
      expect(result.queue.delayed).toBe(1);
      expect(result.queue.completed).toBe(50);
      expect(result.queue.failed).toBe(5);
      expect(result.queue.paused).toBe(0);
      expect(result.db.totalSyncJobs).toBe(100);
      expect(result.db.completedJobs).toBe(80);
      expect(result.db.failedJobs).toBe(15);
      expect(result.db.deadJobs).toBe(7);
    });
  });

  describe('getFailedJobs', () => {
    it('should return paginated failed job records', async () => {
      const mockJobs = [
        { id: 'uuid-1', status: FailedJobStatus.DEAD, marketplace: 'tiktok' },
        { id: 'uuid-2', status: FailedJobStatus.DEAD, marketplace: 'shopee' },
      ];

      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockJobs, 2]),
      };
      mockFailedJobRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getFailedJobs({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply marketplace filter when provided', async () => {
      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockFailedJobRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.getFailedJobs({ marketplace: 'lazada' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'fj.marketplace = :marketplace',
        { marketplace: 'lazada' },
      );
    });
  });

  describe('retryFailedJob', () => {
    it('should re-enqueue and update DB record on success', async () => {
      const mockJob = { retry: jest.fn().mockResolvedValue(undefined) };
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockFailedJobRepo.update.mockResolvedValue(undefined);

      const result = await service.retryFailedJob('bull-job-123');

      expect(result.requeued).toBe(true);
      expect(mockJob.retry).toHaveBeenCalledWith('failed');
      expect(mockFailedJobRepo.update).toHaveBeenCalledWith(
        { bullJobId: 'bull-job-123' },
        expect.objectContaining({ status: FailedJobStatus.RETRIED }),
      );
    });

    it('should return requeued:false if job not found in BullMQ', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.retryFailedJob('non-existent-job');

      expect(result.requeued).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('discardFailedJob', () => {
    it('should discard existing failed job record', async () => {
      const mockRecord = {
        id: 'db-uuid-1',
        bullJobId: 'bull-123',
        status: FailedJobStatus.DEAD,
      };
      mockFailedJobRepo.findOne.mockResolvedValue(mockRecord);
      mockQueue.getJob.mockResolvedValue({ remove: jest.fn() });
      mockFailedJobRepo.update.mockResolvedValue(undefined);

      const result = await service.discardFailedJob('db-uuid-1');

      expect(result.discarded).toBe(true);
      expect(mockFailedJobRepo.update).toHaveBeenCalledWith(
        { id: 'db-uuid-1' },
        { status: FailedJobStatus.DISCARDED },
      );
    });

    it('should return discarded:false when record not found', async () => {
      mockFailedJobRepo.findOne.mockResolvedValue(null);

      const result = await service.discardFailedJob('missing-uuid');

      expect(result.discarded).toBe(false);
    });
  });
});
