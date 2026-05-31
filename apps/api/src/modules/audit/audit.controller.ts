import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { AuditStatus } from '../../database/entities/audit-log.entity';

/**
 * AuditController
 *
 * REST endpoints for querying the persistent audit log.
 * All endpoints are protected by JWT authentication.
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/v1/audit-logs
   * Returns a paginated, filtered list of audit log entries.
   *
   * Query params:
   *   page, limit, actorId, action, resourceType, status, from, to, search
   */
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('status') status?: AuditStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.auditService.findAll({
      page,
      limit,
      actorId,
      action,
      resourceType,
      status,
      from,
      to,
      search,
    });
  }

  /**
   * GET /api/v1/audit-logs/actions
   * Returns the distinct action names recorded in the log.
   * Used to populate the filter dropdown in the dashboard.
   */
  @Get('actions')
  async getActions() {
    const actions = await this.auditService.getDistinctActions();
    return { actions };
  }
}
