import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationSeverity } from '../../database/entities/notification.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * NotificationController
 *
 * Exposes in-app notification REST endpoints.
 * All routes require JWT authentication.
 *
 * Notification visibility: broadcast (userId=null) + user-specific records.
 */
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/v1/notifications
   * Returns paginated, filterable notifications visible to the authenticated user.
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
    @Query('severity') severity?: NotificationSeverity,
    @Query('includeDismissed') includeDismissed?: string,
  ) {
    const userId: string | undefined = req.user?.id;
    const isReadBool =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    const includeDismissedBool = includeDismissed === 'true';

    return this.notificationService.findAll({
      userId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      isRead: isReadBool,
      type,
      severity,
      includeDismissed: includeDismissedBool,
    });
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Returns { count: number } for sidebar badge polling.
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId: string | undefined = req.user?.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * PATCH /api/v1/notifications/read-all
   * Marks all unread notifications as read for the authenticated user.
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req: any) {
    const userId: string | undefined = req.user?.id;
    return this.notificationService.markAllAsRead(userId);
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Marks a single notification as read.
   */
  @Patch(':id/read')
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.markAsRead(id);
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Soft-dismisses a notification.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async dismiss(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.dismiss(id);
  }
}
