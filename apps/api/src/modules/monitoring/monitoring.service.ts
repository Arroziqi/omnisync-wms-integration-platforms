import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { SyncJobEntity, SyncJobStatus } from '../../database/entities/sync-job.entity';
import { FailedJobEntity, FailedJobStatus } from '../../database/entities/failed-job.entity';
import { OrderSyncFailureEntity, SyncFailureStatus } from '../../database/entities/order-sync-failure.entity';
import { MarketplaceAccountEntity, AccountStatus } from '../../database/entities/marketplace-account.entity';
import { WebhookEventEntity, WebhookEventStatus } from '../../database/entities/webhook-event.entity';
import { WebhookDeliveryLogEntity, DeliveryLogStatus } from '../../database/entities/webhook-delivery-log.entity';

export interface DashboardMetrics {
  orders: {
    totalToday: number;
    totalAll: number;
  };
  syncJobs: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
    dead: number;
  };
  webhooks: {
    totalToday: number;
    processed: number;
    failed: number;
  };
  marketplace: {
    activeAccounts: number;
    totalAccounts: number;
    expiredAccounts: number;
  };
  failedOrders: {
    total: number;
    pending: number;
  };
}

export interface SyncStats {
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    deadJobs: number;
    successRate: string;
  };
  last24h: {
    completed: number;
    failed: number;
    avgProcessingMs: number | null;
  };
  byMarketplace: Array<{
    marketplace: string;
    total: number;
    completed: number;
    failed: number;
    successRate: string;
  }>;
  recentJobs: SyncJobEntity[];
}

export interface MarketplaceStats {
  accounts: Array<{
    id: string;
    marketplace: string;
    sellerName: string;
    status: string;
    tokenExpiredAt: Date;
    orderCount: number;
    failedSyncs: number;
    lastSyncAt: Date | null;
  }>;
}

export interface WebhookStats {
  byStatus: {
    received: number;
    processing: number;
    processed: number;
    failed: number;
    ignored: number;
  };
  last1h: {
    received: number;
    failed: number;
    ignored: number;
  };
  recentDeliveryLogs: Array<{
    id: string;
    webhookEventId: string;
    action: string;
    status: string;
    detail: string;
    processingTimeMs: number;
    createdAt: Date;
  }>;
  recentEvents: WebhookEventEntity[];
}

/**
 * MonitoringService
 *
 * Aggregates cross-domain statistics from OrderEntity, SyncJobEntity,
 * FailedJobEntity, WebhookEventEntity, MarketplaceAccountEntity and more
 * to power the real-time Monitoring Dashboard.
 */
@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(SyncJobEntity)
    private readonly syncJobRepo: Repository<SyncJobEntity>,
    @InjectRepository(FailedJobEntity)
    private readonly failedJobRepo: Repository<FailedJobEntity>,
    @InjectRepository(OrderSyncFailureEntity)
    private readonly failureRepo: Repository<OrderSyncFailureEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
    @InjectRepository(WebhookDeliveryLogEntity)
    private readonly deliveryLogRepo: Repository<WebhookDeliveryLogEntity>,
  ) {}

  /**
   * Aggregated KPI metrics for the Overview / Dashboard page.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrdersToday,
      totalOrdersAll,
      pendingJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      deadJobs,
      webhookToday,
      webhookProcessed,
      webhookFailed,
      activeAccounts,
      totalAccounts,
      expiredAccounts,
      failedOrderTotal,
      failedOrderPending,
    ] = await Promise.all([
      this.orderRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.orderRepo.count(),
      this.syncJobRepo.count({ where: { status: SyncJobStatus.PENDING } }),
      this.syncJobRepo.count({ where: { status: SyncJobStatus.ACTIVE } }),
      this.syncJobRepo.count({ where: { status: SyncJobStatus.COMPLETED } }),
      this.syncJobRepo.count({ where: { status: SyncJobStatus.FAILED } }),
      this.failedJobRepo.count({ where: { status: FailedJobStatus.DEAD } }),
      this.webhookEventRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.PROCESSED } }),
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.FAILED } }),
      this.accountRepo.count({ where: { status: AccountStatus.ACTIVE } }),
      this.accountRepo.count(),
      this.accountRepo.count({ where: { status: AccountStatus.EXPIRED } }),
      this.failureRepo.count(),
      this.failureRepo.count({ where: { status: SyncFailureStatus.FAILED } }),
    ]);

    return {
      orders: { totalToday: totalOrdersToday, totalAll: totalOrdersAll },
      syncJobs: { pending: pendingJobs, active: activeJobs, completed: completedJobs, failed: failedJobs, dead: deadJobs },
      webhooks: { totalToday: webhookToday, processed: webhookProcessed, failed: webhookFailed },
      marketplace: { activeAccounts, totalAccounts, expiredAccounts },
      failedOrders: { total: failedOrderTotal, pending: failedOrderPending },
    };
  }

  /**
   * Sync job statistics — summary, last-24h throughput, per-marketplace breakdown.
   */
  async getSyncStats(): Promise<SyncStats> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalJobs, completedJobs, failedJobs, deadJobs] = await Promise.all([
      this.syncJobRepo.count(),
      this.syncJobRepo.count({ where: { status: SyncJobStatus.COMPLETED } }),
      this.syncJobRepo.count({ where: { status: SyncJobStatus.FAILED } }),
      this.failedJobRepo.count({ where: { status: FailedJobStatus.DEAD } }),
    ]);

    const successRate =
      totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) + '%' : 'N/A';

    // Last-24h stats
    const [completed24h, failed24h] = await Promise.all([
      this.syncJobRepo.count({
        where: { status: SyncJobStatus.COMPLETED, createdAt: MoreThanOrEqual(since24h) },
      }),
      this.syncJobRepo.count({
        where: { status: SyncJobStatus.FAILED, createdAt: MoreThanOrEqual(since24h) },
      }),
    ]);

    // Average processing time for completed jobs
    const avgResult = await this.syncJobRepo
      .createQueryBuilder('sj')
      .select('AVG(sj.processingTimeMs)', 'avg')
      .where('sj.status = :status', { status: SyncJobStatus.COMPLETED })
      .andWhere('sj.processingTimeMs IS NOT NULL')
      .getRawOne<{ avg: string | null }>();

    const avgProcessingMs = avgResult?.avg ? Math.round(Number(avgResult.avg)) : null;

    // Per-marketplace breakdown
    const marketplaceRaw = await this.syncJobRepo
      .createQueryBuilder('sj')
      .select('sj.marketplace', 'marketplace')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN sj.status = '${SyncJobStatus.COMPLETED}' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN sj.status = '${SyncJobStatus.FAILED}' THEN 1 ELSE 0 END)`, 'failed')
      .where('sj.marketplace IS NOT NULL')
      .groupBy('sj.marketplace')
      .getRawMany<{ marketplace: string; total: string; completed: string; failed: string }>();

    const byMarketplace = marketplaceRaw.map((r) => {
      const total = Number(r.total);
      const completed = Number(r.completed);
      return {
        marketplace: r.marketplace,
        total,
        completed,
        failed: Number(r.failed),
        successRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : 'N/A',
      };
    });

    // Recent 20 sync jobs
    const recentJobs = await this.syncJobRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      summary: { totalJobs, completedJobs, failedJobs, deadJobs, successRate },
      last24h: { completed: completed24h, failed: failed24h, avgProcessingMs },
      byMarketplace,
      recentJobs,
    };
  }

  /**
   * Per-marketplace statistics — order count, failed syncs, last sync timestamp.
   */
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    const accounts = await this.accountRepo.find({ order: { createdAt: 'DESC' } });

    const results = await Promise.all(
      accounts.map(async (acc) => {
        const [orderCount, failedSyncs] = await Promise.all([
          this.orderRepo.count({ where: { marketplaceAccountId: acc.id } }),
          this.failureRepo.count({ where: { marketplaceAccountId: acc.id } }),
        ]);

        // Find the most recent completed sync job for this account
        const lastJob = await this.syncJobRepo.findOne({
          where: { marketplaceAccountId: acc.id, status: SyncJobStatus.COMPLETED },
          order: { completedAt: 'DESC' },
        });

        const { accessToken, refreshToken, ...publicFields } = acc as any;
        return {
          ...publicFields,
          orderCount,
          failedSyncs,
          lastSyncAt: lastJob?.completedAt ?? null,
        };
      }),
    );

    return { accounts: results };
  }

  /**
   * Webhook event statistics — status distribution, last-1h counts, recent delivery logs.
   */
  async getWebhookStats(): Promise<WebhookStats> {
    const since1h = new Date(Date.now() - 60 * 60 * 1000);

    const [received, processing, processed, failed, ignored] = await Promise.all([
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.RECEIVED } }),
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.PROCESSING } }),
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.PROCESSED } }),
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.FAILED } }),
      this.webhookEventRepo.count({ where: { status: WebhookEventStatus.IGNORED } }),
    ]);

    const [received1h, failed1h, ignored1h] = await Promise.all([
      this.webhookEventRepo.count({ where: { createdAt: MoreThanOrEqual(since1h) } }),
      this.webhookEventRepo.count({
        where: { status: WebhookEventStatus.FAILED, createdAt: MoreThanOrEqual(since1h) },
      }),
      this.webhookEventRepo.count({
        where: { status: WebhookEventStatus.IGNORED, createdAt: MoreThanOrEqual(since1h) },
      }),
    ]);

    const recentDeliveryLogs = await this.deliveryLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 15,
    });

    const recentEvents = await this.webhookEventRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      byStatus: { received, processing, processed, failed, ignored },
      last1h: { received: received1h, failed: failed1h, ignored: ignored1h },
      recentDeliveryLogs: recentDeliveryLogs.map((l) => ({
        id: l.id,
        webhookEventId: l.webhookEventId,
        action: l.action,
        status: l.status,
        detail: l.detail,
        processingTimeMs: l.processingTimeMs,
        createdAt: l.createdAt,
      })),
      recentEvents,
    };
  }
}
