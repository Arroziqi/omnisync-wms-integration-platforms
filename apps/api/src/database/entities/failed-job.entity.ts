import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FailedJobStatus {
  DEAD = 'dead',        // Exhausted all attempts, awaiting manual review
  RETRIED = 'retried',  // Manually re-enqueued by operator
  DISCARDED = 'discarded', // Permanently dismissed
}

/**
 * Dead Letter Queue (DLQ) persistent record.
 * A row is written here whenever a BullMQ job exhausts all retry attempts.
 * Provides operators visibility into permanently failed jobs and enables
 * manual re-enqueue via the queue monitoring API.
 */
@Entity('failed_jobs')
@Index(['status', 'createdAt'])
@Index(['marketplace', 'status'])
export class FailedJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The BullMQ job ID that failed */
  @Column({ name: 'bull_job_id', type: 'varchar', nullable: true })
  bullJobId: string | null;

  @Column({ name: 'sync_job_id', type: 'uuid', nullable: true })
  syncJobId: string | null;

  @Column({ name: 'marketplace_account_id', type: 'uuid' })
  marketplaceAccountId: string;

  @Column({ type: 'varchar', nullable: true })
  marketplace: string | null;

  @Column({ name: 'order_number', type: 'varchar', nullable: true })
  orderNumber: string | null;

  /** Serialized job data for replay */
  @Column({ name: 'job_data', type: 'jsonb' })
  jobData: Record<string, any>;

  @Column({ name: 'final_error', type: 'text' })
  finalError: string;

  @Column({ name: 'total_attempts', type: 'integer' })
  totalAttempts: number;

  @Column({
    type: 'varchar',
    default: FailedJobStatus.DEAD,
  })
  status: FailedJobStatus;

  @Column({ name: 'retried_at', type: 'timestamptz', nullable: true })
  retriedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
