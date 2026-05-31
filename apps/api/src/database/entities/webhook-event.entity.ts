import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookEventStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

export enum WebhookEventType {
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  PAYMENT_COMPLETED = 'payment_completed',
  SHOP_DEAUTHORIZED = 'shop_deauthorized',
  PRODUCT_UPDATED = 'product_updated',
  INVENTORY_UPDATED = 'inventory_updated',
  UNKNOWN = 'unknown',
}

@Entity('webhook_events')
@Index(['marketplace', 'idempotencyKey'], { unique: true })
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Identifies which marketplace dispatched this event (tiktok, shopee, lazada).
   */
  @Column({ type: 'varchar' })
  marketplace: string;

  /**
   * The seller/shop ID associated with this event (used to locate the marketplace account).
   */
  @Column({ name: 'seller_id', type: 'varchar', nullable: true })
  sellerId: string;

  /**
   * Standardized internal event type classification.
   */
  @Column({ name: 'event_type', type: 'varchar', default: WebhookEventType.UNKNOWN })
  eventType: WebhookEventType;

  /**
   * Raw event type label as delivered by the marketplace (used for debugging/auditing).
   */
  @Column({ name: 'raw_event_type', type: 'varchar', nullable: true })
  rawEventType: string;

  /**
   * Full raw JSON payload from the marketplace.
   */
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  /**
   * HMAC signature header value from the marketplace request.
   * Used to verify authenticity; NOT stored for production security (nullable for MVP simulation).
   */
  @Column({ name: 'signature_header', type: 'varchar', nullable: true })
  signatureHeader: string;

  /**
   * Idempotency key: used to detect and reject duplicate events.
   * Typically: marketplace + event_id or marketplace + order_number + event_type.
   */
  @Column({ name: 'idempotency_key', type: 'varchar' })
  idempotencyKey: string;

  /**
   * Timestamp when the webhook was received — used for replay attack detection.
   */
  @Column({ name: 'received_at', type: 'timestamp', default: () => 'now()' })
  receivedAt: Date;

  /**
   * Current processing status of this webhook event.
   */
  @Column({ type: 'varchar', default: WebhookEventStatus.RECEIVED })
  status: WebhookEventStatus;

  /**
   * Error message if processing failed.
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
