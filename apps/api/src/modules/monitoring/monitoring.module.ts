import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { AuthModule } from '../auth/auth.module';
import { OrderEntity } from '../../database/entities/order.entity';
import { SyncJobEntity } from '../../database/entities/sync-job.entity';
import { FailedJobEntity } from '../../database/entities/failed-job.entity';
import { OrderSyncFailureEntity } from '../../database/entities/order-sync-failure.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { WebhookEventEntity } from '../../database/entities/webhook-event.entity';
import { WebhookDeliveryLogEntity } from '../../database/entities/webhook-delivery-log.entity';

/**
 * MonitoringModule
 *
 * Aggregates cross-domain statistics for the Sprint 7 operational
 * visibility dashboard. Does not own any entities — it only reads
 * from repositories owned by other modules.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      SyncJobEntity,
      FailedJobEntity,
      OrderSyncFailureEntity,
      MarketplaceAccountEntity,
      WebhookEventEntity,
      WebhookDeliveryLogEntity,
    ]),
    AuthModule,
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
