import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * GET /api/v1/orders
   * Retrieves all orders with pagination, search, and filters.
   */
  @Get()
  @Permissions('orders:read')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.ordersService.findAll({ page, limit, search, status, accountId });
  }

  /**
   * GET /api/v1/orders/failed
   * Retrieves failed order synchronization logs.
   */
  @Get('failed')
  @Permissions('orders:read')
  async findFailedOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.ordersService.findFailedOrders({ page, limit, search, accountId });
  }

  /**
   * POST /api/v1/orders/failed/bulk-resync
   * Triggers manual synchronization retry for all failed syncs.
   */
  @Post('failed/bulk-resync')
  @Permissions('orders:write')
  @HttpCode(HttpStatus.OK)
  @Audit('order.bulk_resync')
  @UseInterceptors(AuditInterceptor)
  async bulkResyncFailed() {
    return this.ordersService.bulkResyncFailed();
  }

  /**
   * POST /api/v1/orders/failed/:id/resync
   * Triggers manual synchronization retry for a specific failed sync log.
   */
  @Post('failed/:id/resync')
  @Permissions('orders:write')
  @HttpCode(HttpStatus.OK)
  @Audit('order.resync')
  @UseInterceptors(AuditInterceptor)
  async resyncFailedOrder(@Param('id') id: string) {
    return this.ordersService.resyncFailedOrder(id);
  }

  /**
   * POST /api/v1/orders/sync-all
   * Triggers an asynchronous synchronization for all connected active accounts.
   * NOTE: Must be declared before any dynamic :id routes to avoid route shadowing.
   */
  @Post('sync-all')
  @Permissions('orders:write')
  @HttpCode(HttpStatus.OK)
  @Audit('order.sync_all')
  @UseInterceptors(AuditInterceptor)
  async syncAllAccounts() {
    return this.ordersService.syncAllAccounts();
  }

  /**
   * GET /api/v1/orders/:id
   * Retrieves detail metadata of a single order.
   */
  @Get(':id')
  @Permissions('orders:read')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * POST /api/v1/orders/:id/resync
   * Triggers a manual single order synchronization from the marketplace.
   */
  @Post(':id/resync')
  @Permissions('orders:write')
  @HttpCode(HttpStatus.OK)
  async resyncOrder(@Param('id') id: string) {
    return this.ordersService.resyncOrder(id);
  }
}
