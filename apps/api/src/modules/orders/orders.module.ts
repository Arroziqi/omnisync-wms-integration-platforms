import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderSyncService } from './order-sync.service';
import { OrderSyncQueueService } from './order-sync-queue.service';
import { OrderSyncProcessor } from './order-sync.processor';
import { OrderRetryWorkerService } from './order-retry-worker.service';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { OrderSyncFailureEntity } from '../../database/entities/order-sync-failure.entity';
import { SyncJobEntity } from '../../database/entities/sync-job.entity';
import { FailedJobEntity } from '../../database/entities/failed-job.entity';
import { AuthModule } from '../auth/auth.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { QueueModule } from '../queue/queue.module';
import { ORDER_SYNC_QUEUE } from '../queue/queue.constants';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      ProductVariantEntity,
      MarketplaceAccountEntity,
      OrderSyncFailureEntity,
      SyncJobEntity,
      FailedJobEntity,
    ]),
    // Register BullMQ queue for injection into OrderSyncQueueService
    BullModule.registerQueue({ name: ORDER_SYNC_QUEUE }),
    AuthModule,
    forwardRef(() => MarketplaceModule),
    QueueModule,
    NotificationModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderSyncService,
    OrderSyncQueueService,
    OrderSyncProcessor,
    OrderRetryWorkerService, // Deprecated stub — retained for safe removal in future sprint
  ],
  exports: [
    OrdersService,
    OrderSyncService,
    OrderSyncQueueService,
    OrderRetryWorkerService,
  ],
})
export class OrdersModule {}
