import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueMonitoringService } from './queue-monitoring.service';
import { FailedJobStatus } from '../../database/entities/failed-job.entity';

/**
 * Queue Monitoring Controller
 *
 * Provides operational endpoints for inspecting BullMQ queue health,
 * viewing the Dead Letter Queue, and triggering manual job recovery.
 *
 * All endpoints are protected by JWT authentication.
 */
@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueMonitoringController {
  constructor(private readonly monitoringService: QueueMonitoringService) {}

  /**
   * GET /queue/stats
   * Returns real-time BullMQ queue statistics + DB summary.
   */
  @Get('stats')
  async getStats() {
    return this.monitoringService.getQueueStats();
  }

  /**
   * GET /queue/failed-jobs
   * Returns paginated dead-letter queue records.
   */
  @Get('failed-jobs')
  async getFailedJobs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('marketplace') marketplace?: string,
    @Query('status') status?: FailedJobStatus,
  ) {
    return this.monitoringService.getFailedJobs({ page, limit, marketplace, status });
  }

  /**
   * POST /queue/retry/:jobId
   * Re-enqueues a BullMQ failed job by its BullMQ job ID.
   */
  @Post('retry/:jobId')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('jobId') jobId: string) {
    return this.monitoringService.retryFailedJob(jobId);
  }

  /**
   * DELETE /queue/failed-jobs/:id
   * Discards a dead-letter job record (marks as dismissed, removes from BullMQ).
   */
  @Delete('failed-jobs/:id')
  @HttpCode(HttpStatus.OK)
  async discardFailedJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitoringService.discardFailedJob(id);
  }
}
