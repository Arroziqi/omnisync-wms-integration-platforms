import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { OrderSyncFailureEntity, SyncFailureStatus } from '../../database/entities/order-sync-failure.entity';
import { OrderSyncQueueService } from './order-sync-queue.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: jest.Mocked<Repository<OrderEntity>>;
  let itemRepo: jest.Mocked<Repository<OrderItemEntity>>;
  let accountRepo: jest.Mocked<Repository<MarketplaceAccountEntity>>;
  let failureRepo: jest.Mocked<Repository<OrderSyncFailureEntity>>;
  let syncQueue: jest.Mocked<OrderSyncQueueService>;

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(OrderEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderItemEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(MarketplaceAccountEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderSyncFailureEntity), useFactory: mockRepo },
        { provide: OrderSyncQueueService, useValue: mockSyncQueue },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(OrderEntity));
    itemRepo = module.get(getRepositoryToken(OrderItemEntity));
    accountRepo = module.get(getRepositoryToken(MarketplaceAccountEntity));
    failureRepo = module.get(getRepositoryToken(OrderSyncFailureEntity));
    syncQueue = module.get(OrderSyncQueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should query orders list with correct pagination metrics', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
      expect(orderRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an order if it exists', async () => {
      const order = { id: 'order_id', orderNumber: 'ORD-001' } as any;
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.findOne('order_id');
      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('invalid_id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resyncOrder', () => {
    it('should trigger manual sync job for the specific order', async () => {
      const order = { id: 'order_id', orderNumber: 'ORD-001', marketplaceAccountId: 'acc_id' } as any;
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.resyncOrder('order_id');
      expect(result.success).toBe(true);
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('acc_id', 'ORD-001');
    });
  });

  describe('syncAllAccounts', () => {
    it('should queue sync for all active marketplace accounts', async () => {
      accountRepo.find.mockResolvedValue([
        { id: 'acc_1', status: 'active' },
        { id: 'acc_2', status: 'inactive' },
        { id: 'acc_3', status: 'active' },
      ] as any);

      const result = await service.syncAllAccounts();
      expect(result.success).toBe(true);
      expect(syncQueue.addSyncJob).toHaveBeenCalledTimes(2);
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('acc_1');
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('acc_3');
    });
  });

  describe('findFailedOrders', () => {
    it('should return paginated failed order records', async () => {
      const result = await service.findFailedOrders({ page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
      expect(failureRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('resyncFailedOrder', () => {
    it('should trigger enqueue retry and return success', async () => {
      const failure = {
        id: 'fail_id',
        orderNumber: 'ORD-FAIL-001',
        marketplaceAccountId: 'acc_1',
        status: SyncFailureStatus.FAILED,
        retryCount: 0,
      } as any;

      failureRepo.findOne.mockResolvedValue(failure);

      const result = await service.resyncFailedOrder('fail_id');
      expect(result.success).toBe(true);
      expect(failure.status).toBe(SyncFailureStatus.RETRYING);
      expect(failure.retryCount).toBe(1);
      expect(failureRepo.save).toHaveBeenCalledWith(failure);
      expect(syncQueue.addSyncJob).toHaveBeenCalledWith('acc_1', 'ORD-FAIL-001');
    });

    it('should throw NotFoundException if log not found', async () => {
      failureRepo.findOne.mockResolvedValue(null);
      await expect(service.resyncFailedOrder('invalid_id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkResyncFailed', () => {
    it('should retry all failed sync records', async () => {
      const failedList = [
        { id: 'f1', orderNumber: 'O-1', marketplaceAccountId: 'acc_1', status: SyncFailureStatus.FAILED, retryCount: 0 },
        { id: 'f2', orderNumber: 'O-2', marketplaceAccountId: 'acc_1', status: SyncFailureStatus.FAILED, retryCount: 1 },
      ] as any[];

      failureRepo.find.mockResolvedValue(failedList);

      const result = await service.bulkResyncFailed();
      expect(result.success).toBe(true);
      expect(failedList[0].status).toBe(SyncFailureStatus.RETRYING);
      expect(failedList[1].status).toBe(SyncFailureStatus.RETRYING);
      expect(failedList[0].retryCount).toBe(1);
      expect(failedList[1].retryCount).toBe(2);
      expect(failureRepo.save).toHaveBeenCalledTimes(2);
      expect(syncQueue.addSyncJob).toHaveBeenCalledTimes(2);
    });

    it('should handle empty failed lists gracefully', async () => {
      failureRepo.find.mockResolvedValue([]);
      const result = await service.bulkResyncFailed();
      expect(result.success).toBe(true);
      expect(syncQueue.addSyncJob).not.toHaveBeenCalled();
    });
  });
});
