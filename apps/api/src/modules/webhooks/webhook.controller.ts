import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * POST /api/v1/webhooks/tiktok
   * Receives TikTok Shop webhook events.
   * This endpoint is PUBLIC (no JWT) — the marketplace pushes events directly.
   * Security is enforced via HMAC signature validation inside WebhookService.
   */
  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  async handleTikTokWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, any>,
    @Headers('x-tiktok-signature') signatureHeader: string,
    @Headers('x-tiktok-timestamp') timestampHeader: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(payload);
    return this.webhookService.processWebhook({
      marketplace: 'tiktok',
      rawBody,
      signatureHeader: signatureHeader || 'simulated',
      timestampHeader,
      payload,
    });
  }

  /**
   * POST /api/v1/webhooks/shopee
   * Receives Shopee webhook events.
   * This endpoint is PUBLIC — secured via HMAC signature validation inside WebhookService.
   */
  @Post('shopee')
  @HttpCode(HttpStatus.OK)
  async handleShopeeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, any>,
    @Headers('authorization') signatureHeader: string,
    @Headers('x-shopee-timestamp') timestampHeader: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(payload);
    return this.webhookService.processWebhook({
      marketplace: 'shopee',
      rawBody,
      signatureHeader: signatureHeader || 'simulated',
      timestampHeader,
      payload,
    });
  }

  /**
   * POST /api/v1/webhooks/lazada
   * Receives Lazada webhook events.
   * This endpoint is PUBLIC — secured via HMAC signature validation inside WebhookService.
   */
  @Post('lazada')
  @HttpCode(HttpStatus.OK)
  async handleLazadaWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, any>,
    @Headers('x-lazada-signature') signatureHeader: string,
    @Headers('x-lazada-timestamp') timestampHeader: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(payload);
    return this.webhookService.processWebhook({
      marketplace: 'lazada',
      rawBody,
      signatureHeader: signatureHeader || 'simulated',
      timestampHeader,
      payload,
    });
  }

  /**
   * POST /api/v1/webhooks/simulate
   * Simulates a webhook event for local development and QA testing.
   * Requires JWT auth — internal admin use only.
   */
  @Post('simulate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:write')
  @HttpCode(HttpStatus.OK)
  async simulateWebhook(
    @Body()
    body: {
      marketplace: string;
      eventType?: string;
      sellerId?: string;
      orderNumber?: string;
      payload?: Record<string, any>;
    },
  ) {
    const { marketplace, eventType = 'order_create', sellerId = 'test_seller', orderNumber, payload } = body;

    const simulatedPayload = payload || {
      type: eventType,
      shop_id: sellerId,
      shop_id_str: String(sellerId),
      data: {
        order_id: orderNumber || `SIM-${Date.now()}`,
      },
      timestamp: Math.floor(Date.now() / 1000),
      message_id: `sim_${Date.now()}`,
    };

    return this.webhookService.processWebhook({
      marketplace,
      rawBody: JSON.stringify(simulatedPayload),
      signatureHeader: 'simulated',
      payload: simulatedPayload,
    });
  }

  /**
   * GET /api/v1/webhooks
   * Retrieves paginated webhook event history for monitoring.
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:read')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('marketplace') marketplace?: string,
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.webhookService.findAll({ page, limit, marketplace, status, eventType });
  }

  /**
   * GET /api/v1/webhooks/:id/logs
   * Retrieves delivery logs for a specific webhook event.
   */
  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:read')
  async getDeliveryLogs(@Param('id') id: string) {
    return this.webhookService.findDeliveryLogs(id);
  }
}
