import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SyncJobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  DEAD = 'dead', // Moved to DLQ after exhausting all retries
}

export enum SyncJobType {
  ORDER_SYNC = 'order_sync',
  BULK_SYNC = 'bulk_sync',
  WEBHOOK_TRIGGERED = 'webhook_triggered',
}

/**
 * Tracks every job dispatched to the BullMQ order sync queue.
 * Provides a persistent audit trail of queue activity independent of Redis.
 */
@Entity('sync_jobs')
@Index(['status', 'createdAt'])
@Index(['marketplace', 'status'])
export class SyncJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** BullMQ internal job ID for cross-reference */
  @Column({ name: 'bull_job_id', type: 'varchar', nullable: true })
  bullJobId: string | null;

  @Column({ name: 'marketplace_account_id', type: 'uuid' })
  marketplaceAccountId: string;

  @Column({ type: 'varchar', nullable: true })
  marketplace: string | null;

  @Column({ name: 'order_number', type: 'varchar', nullable: true })
  orderNumber: string | null;

  @Column({
    type: 'varchar',
    default: SyncJobType.ORDER_SYNC,
  })
  jobType: SyncJobType;

  @Column({
    type: 'varchar',
    default: SyncJobStatus.PENDING,
  })
  status: SyncJobStatus;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 5 })
  maxAttempts: number;

  @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
  processingTimeMs: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
