import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
  NotificationSeverity,
} from '../../database/entities/notification.entity';

export interface CreateNotificationDto {
  userId?: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface NotificationPage {
  data: NotificationEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * NotificationService
 *
 * Central service for creating and querying in-app failure notifications.
 * Exported from NotificationModule so QueueModule and WebhooksModule can inject it.
 *
 * Broadcast model: userId = null means all admins can see the notification.
 * This service never throws — all writes are best-effort and logged on failure.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  // ─── Write ───────────────────────────────────────────────────────────────────

  /**
   * Creates a new notification record. Never throws.
   */
  async send(dto: CreateNotificationDto): Promise<void> {
    try {
      const entity = this.notificationRepo.create({
        userId: dto.userId ?? null,
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        resourceType: dto.resourceType ?? null,
        resourceId: dto.resourceId ?? null,
        metadata: dto.metadata ?? null,
        isRead: false,
        readAt: null,
        dismissedAt: null,
      });
      await this.notificationRepo.save(entity);
      this.logger.log(
        `[NOTIFY] ${dto.severity.toUpperCase()} — "${dto.title}" (type: ${dto.type})`,
      );
    } catch (err: any) {
      this.logger.error(
        `[NOTIFY] Failed to persist notification "${dto.title}": ${err.message}`,
      );
    }
  }

  /**
   * Convenience: fires a broadcast notification when a sync job enters the DLQ.
   */
  async sendDlqAlert(params: {
    marketplace: string;
    marketplaceAccountId: string;
    orderNumber?: string | null;
    failedJobId: string;
    error: string;
    totalAttempts: number;
  }): Promise<void> {
    await this.send({
      userId: null, // broadcast
      type: NotificationType.DLQ_ALERT,
      severity: NotificationSeverity.CRITICAL,
      title: `Sync Job Permanently Failed — ${params.marketplace}`,
      message: `Order sync exhausted all retries (${params.totalAttempts} attempts). ` +
        `Marketplace: ${params.marketplace}${params.orderNumber ? `, Order: ${params.orderNumber}` : ''}. ` +
        `Error: ${params.error}`,
      resourceType: 'failed_job',
      resourceId: params.failedJobId,
      metadata: {
        marketplace: params.marketplace,
        marketplaceAccountId: params.marketplaceAccountId,
        orderNumber: params.orderNumber,
        totalAttempts: params.totalAttempts,
        error: params.error,
      },
    });
  }

  /**
   * Convenience: fires a broadcast notification when a webhook event fails to process.
   */
  async sendWebhookFailureAlert(params: {
    marketplace: string;
    webhookEventId: string;
    eventType: string;
    error: string;
  }): Promise<void> {
    await this.send({
      userId: null, // broadcast
      type: NotificationType.WEBHOOK_FAILURE,
      severity: NotificationSeverity.ERROR,
      title: `Webhook Processing Failed — ${params.marketplace}`,
      message: `Event type "${params.eventType}" from ${params.marketplace} failed to process. ` +
        `Error: ${params.error}`,
      resourceType: 'webhook_event',
      resourceId: params.webhookEventId,
      metadata: {
        marketplace: params.marketplace,
        eventType: params.eventType,
        error: params.error,
      },
    });
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  /**
   * Returns paginated notifications visible to the given userId
   * (own notifications + all broadcast notifications).
   * Excludes dismissed entries by default.
   */
  async findAll(options: {
    userId?: string;
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: NotificationType;
    severity?: NotificationSeverity;
    includeDismissed?: boolean;
  }): Promise<NotificationPage> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .skip(skip)
      .take(limit)
      .orderBy('n.createdAt', 'DESC');

    // Visibility: broadcast OR targeted to this user
    if (options.userId) {
      qb.andWhere('(n.userId IS NULL OR n.userId = :userId)', { userId: options.userId });
    }

    // Exclude dismissed unless explicitly requested
    if (!options.includeDismissed) {
      qb.andWhere('n.dismissedAt IS NULL');
    }

    if (options.isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead: options.isRead });
    }

    if (options.type) {
      qb.andWhere('n.type = :type', { type: options.type });
    }

    if (options.severity) {
      qb.andWhere('n.severity = :severity', { severity: options.severity });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Returns unread notification count for badge display.
   * Counts broadcast + user-specific unread, excluding dismissed.
   */
  async getUnreadCount(userId?: string): Promise<number> {
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.isRead = false')
      .andWhere('n.dismissedAt IS NULL');

    if (userId) {
      qb.andWhere('(n.userId IS NULL OR n.userId = :userId)', { userId });
    }

    return qb.getCount();
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepo.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }

    return notification;
  }

  /**
   * Marks all unread broadcast + user-specific notifications as read.
   */
  async markAllAsRead(userId?: string): Promise<{ updated: number }> {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true, readAt: new Date() })
      .where('isRead = false')
      .andWhere('dismissedAt IS NULL');

    if (userId) {
      qb.andWhere('(userId IS NULL OR userId = :userId)', { userId });
    }

    const result = await qb.execute();
    return { updated: result.affected ?? 0 };
  }

  /**
   * Soft-dismisses a notification (hides it from future queries).
   */
  async dismiss(id: string): Promise<{ dismissed: boolean }> {
    const notification = await this.notificationRepo.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    notification.dismissedAt = new Date();
    notification.isRead = true;
    notification.readAt = notification.readAt ?? new Date();
    await this.notificationRepo.save(notification);

    return { dismissed: true };
  }
}
