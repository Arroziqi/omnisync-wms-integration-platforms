import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { OrderSyncFailureEntity, SyncFailureStatus } from '../../database/entities/order-sync-failure.entity';
import { OrderSyncQueueService } from './order-sync-queue.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    @InjectRepository(OrderSyncFailureEntity)
    private readonly failureRepo: Repository<OrderSyncFailureEntity>,
    private readonly syncQueue: OrderSyncQueueService,
  ) {}

  /**
   * Retrieves paginated, searchable, and filterable orders list.
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    accountId?: string;
  }) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(100, Number(options.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.marketplaceAccount', 'marketplaceAccount')
      .leftJoinAndSelect('order.items', 'items')
      .skip(skip)
      .take(limit);

    if (options.accountId) {
      qb.andWhere('order.marketplaceAccountId = :accountId', {
        accountId: options.accountId,
      });
    }

    if (options.status) {
      qb.andWhere('order.orderStatus = :status', { status: options.status });
    }

    if (options.search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR order.customerName ILIKE :search OR order.customerPhone ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    qb.orderBy('order.marketplaceCreatedAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves detailed single order metadata.
   */
  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: {
        marketplaceAccount: true,
        items: {
          variant: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  /**
   * Triggers manual resync of a specific order.
   */
  async resyncOrder(id: string): Promise<{ success: boolean; message: string }> {
    const order = await this.findOne(id);
    this.logger.log(`Enqueuing manual resync for order ${order.orderNumber} (ID: ${id})`);
    
    // Add sync job specifically for this order
    this.syncQueue.addSyncJob(order.marketplaceAccountId, order.orderNumber);

    return {
      success: true,
      message: `Manual synchronization enqueued for order "${order.orderNumber}".`,
    };
  }

  /**
   * Triggers synchronization for all active marketplace accounts.
   */
  async syncAllAccounts(): Promise<{ success: boolean; message: string }> {
    const accounts = await this.accountRepo.find();
    const activeAccounts = accounts.filter(
      (acc) => acc.status === 'active',
    );

    if (activeAccounts.length === 0) {
      return {
        success: true,
        message: 'No active marketplace accounts connected.',
      };
    }

    this.logger.log(`Triggering bulk order sync for ${activeAccounts.length} stores.`);
    for (const acc of activeAccounts) {
      this.syncQueue.addSyncJob(acc.id);
    }

    return {
      success: true,
      message: `Successfully enqueued order synchronization for ${activeAccounts.length} channels.`,
    };
  }

  /**
   * Retrieves failed order synchronization logs.
   */
  async findFailedOrders(options: {
    page?: number;
    limit?: number;
    search?: string;
    accountId?: string;
  }) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(100, Number(options.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.failureRepo
      .createQueryBuilder('failure')
      .leftJoinAndSelect('failure.marketplaceAccount', 'marketplaceAccount')
      .skip(skip)
      .take(limit);

    if (options.accountId) {
      qb.andWhere('failure.marketplaceAccountId = :accountId', {
        accountId: options.accountId,
      });
    }

    if (options.search) {
      qb.andWhere(
        '(failure.orderNumber ILIKE :search OR failure.customerName ILIKE :search OR failure.errorMessage ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    qb.orderBy('failure.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Manually retries synchronization for a specific failed sync record by ID.
   */
  async resyncFailedOrder(id: string): Promise<{ success: boolean; message: string }> {
    const failure = await this.failureRepo.findOne({ where: { id } });
    if (!failure) {
      throw new NotFoundException(`Failed sync log with ID "${id}" not found`);
    }

    this.logger.log(`Manual retry requested for failed Order ${failure.orderNumber} (ID: ${id})`);
    
    // Set status to retrying and increment retry count
    failure.status = SyncFailureStatus.RETRYING;
    failure.retryCount += 1;
    await this.failureRepo.save(failure);

    // Enqueue
    this.syncQueue.addSyncJob(failure.marketplaceAccountId, failure.orderNumber);

    return {
      success: true,
      message: `Manual synchronization retry enqueued for Order "${failure.orderNumber}".`,
    };
  }

  /**
   * Manually retries synchronization for all failed sync logs.
   */
  async bulkResyncFailed(): Promise<{ success: boolean; message: string }> {
    const failures = await this.failureRepo.find({
      where: { status: SyncFailureStatus.FAILED },
    });

    if (failures.length === 0) {
      return {
        success: true,
        message: 'No failed order syncs to retry.',
      };
    }

    this.logger.log(`Manual bulk retry requested for ${failures.length} failed orders.`);

    for (const failure of failures) {
      failure.status = SyncFailureStatus.RETRYING;
      failure.retryCount += 1;
      await this.failureRepo.save(failure);

      this.syncQueue.addSyncJob(failure.marketplaceAccountId, failure.orderNumber);
    }

    return {
      success: true,
      message: `Successfully enqueued resync for ${failures.length} failed orders.`,
    };
  }
}
