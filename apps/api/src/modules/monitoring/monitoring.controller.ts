import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitoringService } from './monitoring.service';

/**
 * MonitoringController
 *
 * Provides aggregated, cross-domain statistics APIs powering the
 * Sprint 7 real-time monitoring dashboard.
 *
 * All endpoints are protected by JWT authentication.
 */
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * GET /monitoring/dashboard
   * Returns aggregated KPI tiles: orders today, queue health, webhook counts,
   * marketplace account status, and failed order counts.
   */
  @Get('dashboard')
  async getDashboardMetrics() {
    return this.monitoringService.getDashboardMetrics();
  }

  /**
   * GET /monitoring/sync-stats
   * Returns sync job summary, last-24h throughput, per-marketplace breakdown,
   * and the 20 most recent sync job records.
   */
  @Get('sync-stats')
  async getSyncStats() {
    return this.monitoringService.getSyncStats();
  }

  /**
   * GET /monitoring/marketplace-stats
   * Returns per-marketplace account statistics including order count,
   * failed sync count, last sync timestamp, and connection status.
   */
  @Get('marketplace-stats')
  async getMarketplaceStats() {
    return this.monitoringService.getMarketplaceStats();
  }

  /**
   * GET /monitoring/webhook-stats
   * Returns webhook event counts by status, last-1h stats,
   * and recent delivery logs.
   */
  @Get('webhook-stats')
  async getWebhookStats() {
    return this.monitoringService.getWebhookStats();
  }
}
