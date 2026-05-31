import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Subscription } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { ProductSyncService } from './product-sync.service';

interface SyncJob {
  productId: string;
  marketplaceAccountId: string;
  retryCount: number;
}

@Injectable()
export class ProductSyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductSyncQueueService.name);
  
  // Job pipeline subject
  private readonly queue$ = new Subject<SyncJob>();
  private subscription: Subscription | null = null;
  private readonly maxRetries = 3;

  constructor(private readonly syncService: ProductSyncService) {}

  onModuleInit() {
    this.logger.log('Initializing Product Async Sync Queue Processor...');
    
    // Process jobs sequentially (concurrency = 1) using concatMap to prevent race conditions on marketplace API quotas
    this.subscription = this.queue$
      .pipe(
        concatMap(async (job) => {
          try {
            const success = await this.syncService.syncProductToMarketplace(
              job.productId,
              job.marketplaceAccountId
            );

            if (!success && job.retryCount < this.maxRetries) {
              this.retryJob(job);
            }
          } catch (err: any) {
            this.logger.error(`Exception inside queue processing job: ${err.message}`);
            if (job.retryCount < this.maxRetries) {
              this.retryJob(job);
            }
          }
        })
      )
      .subscribe();
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.logger.log('Product Sync Queue Processor successfully stopped.');
    }
  }

  /**
   * Adds a new product synchronization task to the background queue.
   */
  addSyncJob(productId: string, marketplaceAccountId: string) {
    this.logger.log(`Enqueueing sync job: Product ${productId} -> Store ${marketplaceAccountId}`);
    this.queue$.next({
      productId,
      marketplaceAccountId,
      retryCount: 0,
    });
  }

  /**
   * Retries a failed job with backoff logic.
   */
  private retryJob(job: SyncJob) {
    const nextRetry = job.retryCount + 1;
    const delayMs = Math.pow(2, nextRetry) * 1000; // Exponential backoff: 2s, 4s, 8s...
    
    this.logger.warn(`Sync job failed. Retrying (Attempt ${nextRetry}/${this.maxRetries}) in ${delayMs}ms...`);
    
    setTimeout(() => {
      this.queue$.next({
        productId: job.productId,
        marketplaceAccountId: job.marketplaceAccountId,
        retryCount: nextRetry,
      });
    }, delayMs);
  }
}
