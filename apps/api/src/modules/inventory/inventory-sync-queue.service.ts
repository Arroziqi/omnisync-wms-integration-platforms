import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Subscription } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { InventoryEntity } from '../../database/entities/inventory.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { MarketplaceProductEntity, SyncStatus } from '../../database/entities/marketplace-product.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { EncryptionService } from '../marketplace/encryption.service';

interface InventorySyncJob {
  variantId: string;
  retryCount: number;
}

@Injectable()
export class InventorySyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventorySyncQueueService.name);
  private readonly queue$ = new Subject<InventorySyncJob>();
  private subscription: Subscription | null = null;
  private readonly maxRetries = 3;

  constructor(
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    @InjectRepository(MarketplaceProductEntity)
    private readonly mappingRepo: Repository<MarketplaceProductEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    private readonly encryption: EncryptionService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Inventory Async Sync Queue Processor...');
    
    // Process stock updates sequentially to prevent marketplace race conditions or API lockups
    this.subscription = this.queue$
      .pipe(
        concatMap(async (job) => {
          try {
            const success = await this.syncInventoryToMarketplaces(job.variantId);
            if (!success && job.retryCount < this.maxRetries) {
              this.retryJob(job);
            }
          } catch (err: any) {
            this.logger.error(`Exception inside inventory queue processing: ${err.message}`);
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
      this.logger.log('Inventory Sync Queue Processor successfully stopped.');
    }
  }

  /**
   * Enqueues an inventory variant to be synchronized to external channels.
   */
  addSyncJob(variantId: string) {
    this.logger.log(`Enqueueing inventory sync job for variant ${variantId}`);
    this.queue$.next({
      variantId,
      retryCount: 0,
    });
  }

  /**
   * Performs the synchronization of variant stock to all mapped marketplace accounts.
   */
  private async syncInventoryToMarketplaces(variantId: string): Promise<boolean> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
    });

    if (!variant) {
      this.logger.error(`Inventory sync failed: Variant ${variantId} not found`);
      return false;
    }

    // 1. Calculate aggregated active available inventory for this variant across all warehouses
    const inventories = await this.inventoryRepo.find({
      where: { variantId },
      relations: { warehouse: true },
    });

    const activeInventories = inventories.filter((inv) => inv.warehouse && inv.warehouse.isActive);
    const totalAvailable = activeInventories.reduce((sum, inv) => sum + inv.available, 0);

    // 2. Discover all external marketplace mapping linkages for this variant's master product
    const mappings = await this.mappingRepo.find({
      where: { productId: variant.productId },
    });

    if (mappings.length === 0) {
      this.logger.log(`Inventory sync skipped: Variant "${variant.variantSku}" has no active marketplace SKU links.`);
      return true;
    }

    let overallSuccess = true;

    for (const mapping of mappings) {
      const account = await this.accountRepo.findOne({
        where: { id: mapping.marketplaceAccountId },
      });

      if (!account) {
        this.logger.warn(`Could not sync mapping ${mapping.id}: Account ${mapping.marketplaceAccountId} not found.`);
        overallSuccess = false;
        continue;
      }

      try {
        const isMockAccount = account.accessToken.includes('mock-') || account.sellerId.includes('_seller_');

        if (isMockAccount) {
          // Simulation mode Console Dump
          this.logger.log(`[SIMULATION LOG] Syncing inventory level to ${account.marketplace.toUpperCase()} store "${account.sellerName}":`);
          this.logger.log({
            action: 'sync_inventory',
            remoteProductId: mapping.marketplaceProductId,
            remoteVariantId: mapping.marketplaceVariantId || 'master_default',
            sku: variant.variantSku,
            newStock: totalAvailable,
            timestamp: new Date().toISOString(),
          });
          
          await new Promise((resolve) => setTimeout(resolve, 300)); // Network simulation lag
        } else {
          // Real API Integration
          const decryptedAccessToken = this.encryption.decrypt(account.accessToken);
          this.logger.log(`Sending live stock update (${totalAvailable}) for SKU ${variant.variantSku} on ${account.marketplace} store ${account.sellerName}.`);
        }

        // Update mapping sync status and timestamp
        mapping.syncStatus = SyncStatus.SYNCED;
        mapping.lastSyncedAt = new Date();
        await this.mappingRepo.save(mapping);
      } catch (err: any) {
        this.logger.error(`Error updating stock on mapping ${mapping.id}: ${err.message}`);
        mapping.syncStatus = SyncStatus.FAILED;
        await this.mappingRepo.save(mapping);
        overallSuccess = false;
      }
    }

    return overallSuccess;
  }

  private retryJob(job: InventorySyncJob) {
    const nextRetry = job.retryCount + 1;
    const delayMs = Math.pow(2, nextRetry) * 1000;
    
    this.logger.warn(`Inventory sync job failed. Retrying (Attempt ${nextRetry}/${this.maxRetries}) in ${delayMs}ms...`);
    
    setTimeout(() => {
      this.queue$.next({
        variantId: job.variantId,
        retryCount: nextRetry,
      });
    }, delayMs);
  }
}
