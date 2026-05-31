import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MarketplaceService } from './marketplace.service';
import { ConnectMarketplaceDto } from './dto/connect-marketplace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('marketplace-accounts')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /**
   * GET /api/v1/marketplace-accounts
   * Retrieves all connected marketplace accounts.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:read')
  @Get()
  async getConnectedAccounts() {
    return this.marketplaceService.getConnectedAccounts();
  }

  /**
   * POST /api/v1/marketplace-accounts/connect
   * Generates authorization URL for a specific marketplace.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:write')
  @Post('connect')
  @Audit('marketplace.connect')
  @UseInterceptors(AuditInterceptor)
  async connect(
    @Body() dto: ConnectMarketplaceDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId;
    return this.marketplaceService.connect(dto.marketplace, userId);
  }

  /**
   * GET /api/v1/marketplace-accounts/oauth/callback
   * Public redirect endpoint hit by marketplace auth server.
   */
  @Get('oauth/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    try {
      if (!code || !state) {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?status=error&message=${encodeURIComponent('Missing code or state parameters')}`
        );
      }
      await this.marketplaceService.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/integrations?status=success`);
    } catch (err) {
      return res.redirect(
        `${frontendUrl}/dashboard/integrations?status=error&message=${encodeURIComponent(err.message)}`
      );
    }
  }

  /**
   * POST /api/v1/marketplace-accounts/health-check
   * Manually triggers a quick diagnostics scan for all channels.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:write')
  @Post('health-check')
  @HttpCode(HttpStatus.OK)
  async checkAllHealth() {
    return this.marketplaceService.checkAllAccountsHealth();
  }

  /**
   * POST /api/v1/marketplace-accounts/check-expirations
   * Manually scans database for expired tokens and flags them.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:write')
  @Post('check-expirations')
  @HttpCode(HttpStatus.OK)
  async checkAllExpirations() {
    return this.marketplaceService.checkTokenExpirations();
  }

  /**
   * POST /api/v1/marketplace-accounts/:id/refresh-token
   * Manually triggers credential refresh.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:write')
  @Post(':id/refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Param('id') id: string) {
    return this.marketplaceService.refreshAccountTokens(id);
  }

  /**
   * DELETE /api/v1/marketplace-accounts/:id
   * Disconnects/Soft-deletes a marketplace connection.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:write')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit('marketplace.disconnect')
  @UseInterceptors(AuditInterceptor)
  async disconnectAccount(@Param('id') id: string) {
    await this.marketplaceService.disconnectAccount(id);
  }

  /**
   * GET /api/v1/marketplace-accounts/:id/health
   * Performs quick health diagnostic check on active access token.
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('marketplace:read')
  @Get(':id/health')
  async getHealth(@Param('id') id: string) {
    return this.marketplaceService.getAccountHealth(id);
  }
}
