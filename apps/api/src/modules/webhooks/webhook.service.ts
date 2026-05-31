import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import * as crypto from 'crypto';
import {
  WebhookEventEntity,
  WebhookEventStatus,
  WebhookEventType,
} from '../../database/entities/webhook-event.entity';
import {
  WebhookDeliveryLogEntity,
  DeliveryLogStatus,
} from '../../database/entities/webhook-delivery-log.entity';
import { OrderSyncQueueService } from '../orders/order-sync-queue.service';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { NotificationService } from '../notifications/notification.service';

/**
 * Maximum allowed age of a webhook payload (in seconds).
 * Events older than this are rejected as potential replay attacks.
 */
const WEBHOOK_REPLAY_WINDOW_SECONDS = 300; // 5 minutes

/**
 * Marketplace-specific HMAC shared secrets.
 * In production: load from ConfigService / secrets manager.
 */
const WEBHOOK_SECRETS: Record<string, string> = {
  tiktok: process.env.TIKTOK_WEBHOOK_SECRET || 'tiktok-webhook-dev-secret',
  shopee: process.env.SHOPEE_WEBHOOK_SECRET || 'shopee-webhook-dev-secret',
  lazada: process.env.LAZADA_WEBHOOK_SECRET || 'lazada-webhook-dev-secret',
};

/**
 * Maps raw marketplace event strings to our internal WebhookEventType enum.
 */
const EVENT_TYPE_MAP: Record<string, WebhookEventType> = {
  // TikTok Shop events
  order_create: WebhookEventType.ORDER_CREATED,
  order_status_change: WebhookEventType.ORDER_UPDATED,
  order_cancel: WebhookEventType.ORDER_CANCELLED,
  // Shopee events
  ORDER_CREATE: WebhookEventType.ORDER_CREATED,
  ORDER_UPDATE: WebhookEventType.ORDER_UPDATED,
  // Lazada events
  SELLER_PRODUCTS_UPDATE: WebhookEventType.PRODUCT_UPDATED,
  ORDER_STATUS_UPDATE: WebhookEventType.ORDER_UPDATED,
  // Common across platforms
  shop_deauthorized: WebhookEventType.SHOP_DEAUTHORIZED,
  PAYMENT_COMPLETED: WebhookEventType.PAYMENT_COMPLETED,
};

/**
 * Order status event types that should trigger an order resync.
 */
const ORDER_SYNC_EVENT_TYPES = new Set([
  WebhookEventType.ORDER_CREATED,
  WebhookEventType.ORDER_UPDATED,
  WebhookEventType.ORDER_CANCELLED,
  WebhookEventType.ORDER_SHIPPED,
  WebhookEventType.ORDER_DELIVERED,
  WebhookEventType.PAYMENT_COMPLETED,
]);

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
    @InjectRepository(WebhookDeliveryLogEntity)
    private readonly deliveryLogRepo: Repository<WebhookDeliveryLogEntity>,
    @InjectRepository(MarketplaceAccountEntity)
    private readonly accountRepo: Repository<MarketplaceAccountEntity>,
    private readonly syncQueue: OrderSyncQueueService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Main entry point: processes an incoming marketplace webhook.
   *
   * Security layer executes in order:
   *   1. Signature validation  — verifies HMAC authenticity
   *   2. Replay attack prevention — rejects stale payloads (> 5 min old)
   *   3. Duplicate event prevention — idempotent insert via unique constraint
   *   4. State transition safeguards — validates event flow before dispatch
   *   5. Queue publisher — routes valid events into the order sync pipeline
   */
  async processWebhook(params: {
    marketplace: string;
    rawBody: string;
    signatureHeader: string;
    timestampHeader?: string;
    payload: Record<string, any>;
  }): Promise<{ received: boolean; message: string }> {
    const startTime = Date.now();
    const { marketplace, rawBody, signatureHeader, timestampHeader, payload } = params;

    this.logger.log(`[WEBHOOK] Incoming ${marketplace.toUpperCase()} webhook event`);

    // ── STEP 1: Signature Validation ─────────────────────────────────────────
    const signatureValid = this.validateSignature(marketplace, rawBody, signatureHeader);
    if (!signatureValid) {
      this.logger.warn(`[WEBHOOK] REJECTED — Invalid HMAC signature for ${marketplace.toUpperCase()} webhook`);
      // We still acknowledge receipt to the marketplace to prevent retries for auth failures
      throw new BadRequestException('Webhook signature validation failed');
    }
    this.logger.log(`[WEBHOOK] Signature verified for ${marketplace.toUpperCase()} webhook`);

    // ── STEP 2: Replay Attack Prevention ─────────────────────────────────────
    const timestampMs = this.extractTimestamp(payload, timestampHeader);
    if (timestampMs) {
      const ageSeconds = (Date.now() - timestampMs) / 1000;
      if (ageSeconds > WEBHOOK_REPLAY_WINDOW_SECONDS) {
        this.logger.warn(
          `[WEBHOOK] REJECTED — Replay attack detected. Payload is ${Math.round(ageSeconds)}s old (limit: ${WEBHOOK_REPLAY_WINDOW_SECONDS}s)`,
        );
        throw new BadRequestException('Webhook rejected: payload timestamp is too old (replay attack prevention)');
      }
    }

    // ── STEP 3: Classify Event Type ──────────────────────────────────────────
    const rawEventType = payload.type || payload.event_type || payload.event || 'unknown';
    const eventType = EVENT_TYPE_MAP[rawEventType] || WebhookEventType.UNKNOWN;
    const sellerId = this.extractSellerId(marketplace, payload);
    const idempotencyKey = this.buildIdempotencyKey(marketplace, payload, rawEventType);

    // ── STEP 4: Duplicate Event Prevention (Idempotency) ─────────────────────
    let webhookEvent: WebhookEventEntity;
    try {
      webhookEvent = this.webhookEventRepo.create({
        marketplace,
        sellerId,
        eventType,
        rawEventType,
        payload,
        signatureHeader,
        idempotencyKey,
        receivedAt: new Date(),
        status: WebhookEventStatus.RECEIVED,
      });
      webhookEvent = await this.webhookEventRepo.save(webhookEvent);

      this.logger.log(
        `[WEBHOOK] Event recorded: ${marketplace.toUpperCase()} | ${eventType} | Idempotency: ${idempotencyKey}`,
      );
    } catch (err: any) {
      // Unique constraint violation = duplicate event
      if (err instanceof QueryFailedError && err.message.includes('duplicate key')) {
        this.logger.warn(
          `[WEBHOOK] DUPLICATE EVENT IGNORED — Idempotency key already processed: ${idempotencyKey}`,
        );
        return { received: true, message: 'Duplicate event ignored (already processed)' };
      }
      throw err;
    }

    // ── STEP 5: State Transition Safeguards + Queue Publisher ───────────────
    const processingStartMs = Date.now();
    try {
      webhookEvent.status = WebhookEventStatus.PROCESSING;
      await this.webhookEventRepo.save(webhookEvent);

      const result = await this.dispatchWebhookEvent(webhookEvent, payload);

      webhookEvent.status = WebhookEventStatus.PROCESSED;
      await this.webhookEventRepo.save(webhookEvent);

      await this.logDelivery({
        webhookEventId: webhookEvent.id,
        action: result.action,
        status: DeliveryLogStatus.SUCCESS,
        detail: result.detail,
        processingTimeMs: Date.now() - processingStartMs,
      });

      this.logger.log(
        `[WEBHOOK] Successfully processed: ${eventType} | Action: ${result.action} | ${Date.now() - startTime}ms`,
      );

      return { received: true, message: `Webhook event processed: ${result.action}` };
    } catch (err: any) {
      webhookEvent.status = WebhookEventStatus.FAILED;
      webhookEvent.errorMessage = err.message;
      await this.webhookEventRepo.save(webhookEvent);

      await this.logDelivery({
        webhookEventId: webhookEvent.id,
        action: 'PROCESSING_ERROR',
        status: DeliveryLogStatus.FAILED,
        detail: err.message,
        processingTimeMs: Date.now() - processingStartMs,
      });

      this.logger.error(`[WEBHOOK] Processing failed for event ${webhookEvent.id}: ${err.message}`);

      // Fire an in-app failure notification (best-effort, never throws)
      void this.notificationService.sendWebhookFailureAlert({
        marketplace,
        webhookEventId: webhookEvent.id,
        eventType: String(webhookEvent.eventType),
        error: err.message,
      });

      // Return acknowledgement to marketplace to prevent infinite retries on application errors
      return { received: true, message: 'Webhook received; processing encountered an error' };
    }
  }

  /**
   * Routes a validated, de-duplicated webhook event to the appropriate handler.
   * Implements state transition safeguards to prevent invalid action sequences.
   */
  private async dispatchWebhookEvent(
    event: WebhookEventEntity,
    payload: Record<string, any>,
  ): Promise<{ action: string; detail: string }> {
    const { eventType, marketplace, sellerId } = event;

    // ── STATE TRANSITION SAFEGUARD: Find corresponding account ───────────────
    // We only dispatch to the sync queue if the marketplace account is ACTIVE.
    // This prevents processing events from disconnected or revoked accounts.
    if (ORDER_SYNC_EVENT_TYPES.has(eventType)) {
      const account = await this.accountRepo.findOne({
        where: { marketplace: marketplace as any, sellerId },
      });

      if (!account) {
        this.logger.warn(
          `[WEBHOOK] No marketplace account found for ${marketplace}/${sellerId}. Ignoring order event.`,
        );
        event.status = WebhookEventStatus.IGNORED;

        return {
          action: 'IGNORED_NO_ACCOUNT',
          detail: `No active marketplace account found for seller ${sellerId} on ${marketplace}`,
        };
      }

      if (account.status !== 'active') {
        this.logger.warn(
          `[WEBHOOK] Account ${account.id} is ${account.status}. Rejecting order event to enforce state transitions.`,
        );

        return {
          action: 'IGNORED_INACTIVE_ACCOUNT',
          detail: `Account status is "${account.status}" — only active accounts may receive order events`,
        };
      }

      // Extract the affected order number from the payload (marketplace-specific parsing)
      const orderNumber = this.extractOrderNumber(marketplace, payload);

      // Enqueue order-specific sync job into the sequential RxJS queue
      this.syncQueue.addSyncJob(account.id, orderNumber);

      return {
        action: 'ENQUEUED_ORDER_SYNC',
        detail: `Order sync enqueued for Account ${account.id}${orderNumber ? ` | Order ${orderNumber}` : ' (bulk)'}`,
      };
    }

    // Shop deauthorization event — handled differently
    if (eventType === WebhookEventType.SHOP_DEAUTHORIZED) {
      const account = await this.accountRepo.findOne({
        where: { marketplace: marketplace as any, sellerId },
      });

      if (account) {
        account.status = 'disconnected' as any;
        await this.accountRepo.save(account);
        await this.accountRepo.softDelete(account.id);
        this.logger.log(`[WEBHOOK] Shop deauthorized. Account ${account.id} disconnected.`);
      }

      return {
        action: 'SHOP_DEAUTHORIZED',
        detail: `Marketplace account for seller ${sellerId} has been deauthorized and disconnected`,
      };
    }

    // Unknown / unhandled event type
    event.status = WebhookEventStatus.IGNORED;
    return {
      action: 'IGNORED_UNKNOWN_EVENT',
      detail: `Event type "${eventType}" does not map to a supported handler`,
    };
  }

  /**
   * Validates the HMAC-SHA256 signature from the marketplace against our shared secret.
   *
   * In simulation mode (no real signature header), we skip validation to allow
   * local dev/testing without requiring actual marketplace credentials.
   */
  validateSignature(marketplace: string, rawBody: string, signatureHeader: string): boolean {
    // Simulation mode: skip validation if no signature provided (for dev/testing)
    if (!signatureHeader || signatureHeader === 'simulated') {
      this.logger.warn(`[WEBHOOK] Signature validation BYPASSED — simulation mode (marketplace: ${marketplace})`);
      return true;
    }

    const secret = WEBHOOK_SECRETS[marketplace.toLowerCase()];
    if (!secret) {
      this.logger.error(`[WEBHOOK] No webhook secret configured for marketplace: ${marketplace}`);
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex');

      // Use timingSafeEqual to prevent timing-based signature oracle attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(signatureHeader.replace(/^sha256=/, ''), 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      this.logger.error(`[WEBHOOK] Signature comparison error: ${err}`);
      return false;
    }
  }

  /**
   * Builds a marketplace-specific unique idempotency key for duplicate event detection.
   */
  private buildIdempotencyKey(
    marketplace: string,
    payload: Record<string, any>,
    rawEventType: string,
  ): string {
    // Extract the marketplace-native event ID if available
    const eventId =
      payload.message_id ||
      payload.event_id ||
      payload.order_id ||
      payload.orderId ||
      payload.data?.order_id ||
      null;

    if (eventId) {
      return `${marketplace}:${rawEventType}:${eventId}`;
    }

    // Fallback: hash the full payload for a deterministic fingerprint
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 16);

    return `${marketplace}:${rawEventType}:hash_${payloadHash}`;
  }

  /**
   * Extracts the Unix timestamp from the payload or request header.
   * Returns null if no timestamp can be determined.
   */
  private extractTimestamp(
    payload: Record<string, any>,
    timestampHeader?: string,
  ): number | null {
    // Try header first (some marketplaces send X-Timestamp in seconds)
    if (timestampHeader) {
      const parsed = parseInt(timestampHeader, 10);
      if (!isNaN(parsed)) {
        return parsed < 1e12 ? parsed * 1000 : parsed; // convert seconds → ms
      }
    }

    // Try payload fields
    const rawTs = payload.timestamp || payload.ts || payload.created_time || payload.message_time;
    if (rawTs) {
      const parsed = parseInt(rawTs, 10);
      if (!isNaN(parsed)) {
        return parsed < 1e12 ? parsed * 1000 : parsed;
      }
    }

    return null;
  }

  /**
   * Extracts the seller/shop ID from the marketplace-specific payload structure.
   */
  private extractSellerId(marketplace: string, payload: Record<string, any>): string {
    switch (marketplace.toLowerCase()) {
      case 'tiktok':
        return payload.shop_id || payload.seller_id || 'unknown';
      case 'shopee':
        return String(payload.shop_id || payload.shopid || 'unknown');
      case 'lazada':
        return payload.seller_id || payload.shop_id || 'unknown';
      default:
        return payload.seller_id || payload.shop_id || 'unknown';
    }
  }

  /**
   * Extracts the order number from the marketplace-specific payload structure.
   */
  private extractOrderNumber(marketplace: string, payload: Record<string, any>): string | undefined {
    switch (marketplace.toLowerCase()) {
      case 'tiktok':
        return payload.data?.order_id || payload.order_id;
      case 'shopee':
        return payload.data?.ordersn || payload.ordersn;
      case 'lazada':
        return payload.data?.order_id || payload.order_id;
      default:
        return payload.order_id || payload.order_number;
    }
  }

  /**
   * Persists a delivery log entry for audit and debugging purposes.
   */
  private async logDelivery(params: {
    webhookEventId: string;
    action: string;
    status: DeliveryLogStatus;
    detail?: string;
    processingTimeMs?: number;
  }): Promise<void> {
    try {
      const log = this.deliveryLogRepo.create({
        webhookEventId: params.webhookEventId,
        action: params.action,
        status: params.status,
        detail: params.detail,
        processingTimeMs: params.processingTimeMs,
      });
      await this.deliveryLogRepo.save(log);
    } catch (err: any) {
      this.logger.error(`[WEBHOOK] Failed to write delivery log: ${err.message}`);
    }
  }

  /**
   * Retrieves paginated webhook event records for monitoring.
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    marketplace?: string;
    status?: string;
    eventType?: string;
  }) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.webhookEventRepo
      .createQueryBuilder('event')
      .skip(skip)
      .take(limit)
      .orderBy('event.receivedAt', 'DESC');

    if (options.marketplace) {
      qb.andWhere('event.marketplace = :marketplace', { marketplace: options.marketplace });
    }
    if (options.status) {
      qb.andWhere('event.status = :status', { status: options.status });
    }
    if (options.eventType) {
      qb.andWhere('event.eventType = :eventType', { eventType: options.eventType });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves delivery logs for a specific webhook event.
   */
  async findDeliveryLogs(webhookEventId: string) {
    return this.deliveryLogRepo.find({
      where: { webhookEventId },
      order: { createdAt: 'ASC' },
    });
  }
}
