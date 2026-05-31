import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ORDER_SYNC_QUEUE } from '../queue/queue.constants';
import { OrderSyncService } from './order-sync.service';
import { ApiQuotaManagerService } from '../queue/api-quota-manager.service';
import {
  SyncJobEntity,
  SyncJobStatus,
} from '../../database/entities/sync-job.entity';
import {
  FailedJobEntity,
  FailedJobStatus,
} from '../../database/entities/failed-job.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { NotificationService } from '../notifications/notification.service';

export interface OrderSyncJobData {
  accountId: string;
  orderNumber?: string;
  marketplace?: string;
  syncJobId?: string;
}

/**
 * BullMQ Order Sync Processor
 *
 * Consumes jobs from the ORDER_SYNC_QUEUE. Each job may be:
 *  - A single-order sync triggered by a webhook event
 *  - A bulk/historical sync triggered on marketplace account connection
 *
 * Retry policy (configured in OrderSyncQueueService.addSyncJob):
 *  - Up to 5 attempts
 *  - Exponential backoff: 2s → 4s → 8s → 16s → 32s
 *
 * On final failure:
 *  - Writes a FailedJobEntity (DLQ record) for operator visibility
 *  - Updates the SyncJobEntity to status = DEAD
 */
@Injectable()
@Processor(ORDER_SYNC_QUEUE, { concurrency: Number(process.env.QUEUE_CONCURRENCY) || 5 })
export class OrderSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderSyncProcessor.name);

  constructor(
    private readonly syncService: OrderSyncService,
    private readonly quotaManager: ApiQuotaManagerService,
    @InjectRepository(SyncJobEntity)
    private readonly syncJobRepo: Repository<SyncJobEntity>,
    @InjectRepository(FailedJobEntity)
    private readonly failedJobRepo: Repository<FailedJobEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  /**
   * Main job handler — invoked by BullMQ for each job in the queue.
   */
  async process(job: Job<OrderSyncJobData>): Promise<boolean> {
    const { accountId, orderNumber, marketplace, syncJobId } = job.data;
    const startMs = Date.now();

    this.logger.log(
      `[PROCESSOR] Processing job ${job.id} | Account: ${accountId} | ` +
        `Order: ${orderNumber ?? 'bulk'} | Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`,
    );

    // Update sync job record to ACTIVE on first attempt
    if (syncJobId && job.attemptsMade === 0) {
      await this.syncJobRepo.update(
        { id: syncJobId },
        { status: SyncJobStatus.ACTIVE, bullJobId: job.id ?? null },
      );
    }

    // Enforce marketplace API quota before dispatching
    const resolvedMarketplace = marketplace || (await this.resolveMarketplace(accountId));
    if (resolvedMarketplace) {
      await this.quotaManager.waitForSlot(resolvedMarketplace);
    }

    // Execute the actual order sync
    const success = await this.syncService.syncOrdersForAccount(accountId, orderNumber);

    if (!success) {
      throw new Error(`syncOrdersForAccount returned false for account ${accountId}`);
    }

    const processingTimeMs = Date.now() - startMs;

    // Mark sync job as completed
    if (syncJobId) {
      await this.syncJobRepo.update(
        { id: syncJobId },
        {
          status: SyncJobStatus.COMPLETED,
          processingTimeMs,
          completedAt: new Date(),
          attemptCount: job.attemptsMade + 1,
        },
      );
    }

    this.logger.log(
      `[PROCESSOR] Job ${job.id} completed in ${processingTimeMs}ms`,
    );

    return true;
  }

  /**
   * Triggered by BullMQ when a job has exhausted all retry attempts.
   * Writes a FailedJobEntity (DLQ record) and marks the SyncJobEntity as DEAD.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<OrderSyncJobData>, error: Error): Promise<void> {
    const { accountId, orderNumber, marketplace, syncJobId } = job.data;
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

    this.logger.error(
      `[PROCESSOR] Job ${job.id} FAILED (attempt ${job.attemptsMade}/${job.opts.attempts}): ${error.message}`,
    );

    if (!isFinalAttempt) {
      // More retries remain — BullMQ will handle backoff automatically
      return;
    }

    this.logger.error(
      `[PROCESSOR] Job ${job.id} EXHAUSTED all retries. Writing to DLQ...`,
    );

    try {
      // Write DLQ record
      const dlqRecord = this.failedJobRepo.create({
        bullJobId: job.id ?? null,
        syncJobId: syncJobId ?? null,
        marketplaceAccountId: accountId,
        marketplace: marketplace ?? null,
        orderNumber: orderNumber ?? null,
        jobData: job.data,
        finalError: error.message,
        totalAttempts: job.attemptsMade,
        status: FailedJobStatus.DEAD,
      });
      await this.failedJobRepo.save(dlqRecord);

      // Fire broadcast DLQ alert notification (best-effort)
      void this.notificationService.sendDlqAlert({
        marketplace: marketplace ?? 'unknown',
        marketplaceAccountId: accountId,
        orderNumber: orderNumber ?? null,
        failedJobId: dlqRecord.id,
        error: error.message,
        totalAttempts: job.attemptsMade,
      });

      // Mark sync job as DEAD
      if (syncJobId) {
        await this.syncJobRepo.update(
          { id: syncJobId },
          {
            status: SyncJobStatus.DEAD,
            errorMessage: error.message,
            attemptCount: job.attemptsMade,
          },
        );
      }

      this.logger.warn(
        `[PROCESSOR] DLQ record created for job ${job.id}. ` +
          `Manual intervention required for Account ${accountId} | Order: ${orderNumber ?? 'bulk'}`,
      );
    } catch (dlqErr: any) {
      this.logger.error(
        `[PROCESSOR] Failed to write DLQ record for job ${job.id}: ${dlqErr.message}`,
      );
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.debug(`[PROCESSOR] Job ${job.id} is now active (attempt ${job.attemptsMade + 1})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.debug(`[PROCESSOR] Job ${job.id} successfully completed`);
  }

  /**
   * Resolves the marketplace platform string from the account entity.
   */
  private async resolveMarketplace(accountId: string): Promise<string | null> {
    try {
      const account = await this.accountRepo.findOne({
        where: { id: accountId },
        select: { marketplace: true },
      });
      return account?.marketplace ?? null;
    } catch {
      return null;
    }
  }
}
