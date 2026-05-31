import { Injectable, Logger } from '@nestjs/common';

/**
 * @deprecated This service has been superseded by BullMQ native retry in User Story 6.2.
 *
 * Previously, this service used a `setInterval` loop to scan the `order_sync_failures`
 * table every 30 seconds and re-enqueue eligible failures.
 *
 * As of Sprint 6, User Story 6.2, retry logic is handled natively by BullMQ:
 *  - Exponential backoff is configured per job (2s → 4s → 8s → 16s → 32s)
 *  - Max retry attempts are enforced by the BullMQ Worker
 *  - Dead-letter records are written by `OrderSyncProcessor.onFailed()`
 *
 * This class is retained as a documented stub to preserve import references
 * and avoid breaking the `OrdersModule` provider array during the transition.
 * It may be fully removed in a future cleanup sprint.
 *
 * @see OrderSyncProcessor — handles retry via BullMQ @OnWorkerEvent('failed')
 * @see QueueMonitoringService — exposes manual retry via POST /queue/retry/:jobId
 */
@Injectable()
export class OrderRetryWorkerService {
  private readonly logger = new Logger(OrderRetryWorkerService.name);

  constructor() {
    this.logger.warn(
      '[DEPRECATED] OrderRetryWorkerService is a no-op stub. ' +
        'Retry logic is now handled by BullMQ via OrderSyncProcessor.',
    );
  }
}
