import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORDER_SYNC_QUEUE, ORDER_SYNC_DLQ } from './queue.constants';
import { ApiQuotaManagerService } from './api-quota-manager.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { QueueMonitoringController } from './queue-monitoring.controller';
import { SyncJobEntity } from '../../database/entities/sync-job.entity';
import { FailedJobEntity } from '../../database/entities/failed-job.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * QueueModule
 *
 * Global BullMQ queue infrastructure module. Responsibilities:
 *  - Registers BullMQ with Redis via ConfigService
 *  - Declares the ORDER_SYNC_QUEUE and ORDER_SYNC_DLQ
 *  - Provides ApiQuotaManagerService for rate limiting
 *  - Provides QueueMonitoringService + controller for operational visibility
 *
 * Imported by AppModule. The ORDER_SYNC_QUEUE registration is exported
 * so OrdersModule can inject the Queue for job dispatch.
 */
@Module({
  imports: [
    // BullMQ connection — wired to Redis via ConfigService
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: { count: 500 },
          removeOnFail: false,
        },
      }),
    }),

    // Register named queues
    BullModule.registerQueue(
      { name: ORDER_SYNC_QUEUE },
      { name: ORDER_SYNC_DLQ },
    ),

    // Entity access for monitoring service
    TypeOrmModule.forFeature([SyncJobEntity, FailedJobEntity]),

    AuthModule,
  ],
  controllers: [QueueMonitoringController],
  providers: [ApiQuotaManagerService, QueueMonitoringService],
  exports: [
    // Export queue and services so other modules can inject them
    BullModule,
    ApiQuotaManagerService,
    QueueMonitoringService,
  ],
})
export class QueueModule {}
