import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  SYNC_FAILURE = 'sync_failure',
  WEBHOOK_FAILURE = 'webhook_failure',
  DLQ_ALERT = 'dlq_alert',
  SYSTEM = 'system',
}

export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Notification entity.
 *
 * Stores in-app notifications for operational failure events:
 * - Failed sync jobs (DLQ entries)
 * - Failed webhook deliveries
 * - System alerts
 *
 * userId = null means broadcast (visible to all admins).
 */
@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['type', 'createdAt'])
@Index(['isRead', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Target user. NULL = broadcast notification visible to all admins. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({
    type: 'varchar',
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
    default: NotificationSeverity.INFO,
  })
  severity: NotificationSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  /** Optional link to the originating resource (e.g. 'failed_job', 'webhook_event') */
  @Column({ name: 'resource_type', type: 'varchar', nullable: true })
  resourceType: string | null;

  /** ID of the originating resource for deep-link navigation */
  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId: string | null;

  /** Additional structured context (marketplace, order numbers, error details…) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /** When the notification was read (for analytics / TTL cleanup) */
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  /** Soft-delete: dismissed notifications are filtered from default queries */
  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
