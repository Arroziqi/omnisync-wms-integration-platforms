import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WebhookEventEntity } from './webhook-event.entity';

export enum DeliveryLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('webhook_delivery_logs')
export class WebhookDeliveryLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The parent webhook event this delivery log belongs to.
   */
  @Column({ name: 'webhook_event_id', type: 'uuid' })
  webhookEventId: string;

  @ManyToOne(() => WebhookEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_event_id' })
  webhookEvent: WebhookEventEntity;

  /**
   * What happened during this processing attempt (e.g., 'ENQUEUED_ORDER_SYNC', 'SIGNATURE_INVALID').
   */
  @Column({ type: 'varchar' })
  action: string;

  /**
   * Success, failure, or skip — outcome of this delivery attempt.
   */
  @Column({ type: 'varchar', default: DeliveryLogStatus.SUCCESS })
  status: DeliveryLogStatus;

  /**
   * Human-readable outcome detail (informational or error message).
   */
  @Column({ name: 'detail', type: 'text', nullable: true })
  detail: string;

  /**
   * Time taken to process this webhook event (in milliseconds).
   */
  @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
  processingTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
