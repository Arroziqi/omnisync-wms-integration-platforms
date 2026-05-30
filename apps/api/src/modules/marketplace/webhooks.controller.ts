import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { DeauthorizeDto } from './dto/deauthorize.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /**
   * POST /api/v1/webhooks/deauthorization
   * Public endpoint called by external marketplace when application is uninstalled/revoked.
   */
  @Post('deauthorization')
  @HttpCode(HttpStatus.OK)
  async handleDeauthorization(@Body() dto: DeauthorizeDto) {
    await this.marketplaceService.handleDeauthorization(
      dto.marketplace,
      dto.seller_id,
    );
    return { success: true };
  }
}
