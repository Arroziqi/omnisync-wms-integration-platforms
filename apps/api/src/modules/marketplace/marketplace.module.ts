import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { OAuthStateEntity } from '../../database/entities/oauth-state.entity';
import { EncryptionService } from './encryption.service';
import { TikTokConnectorService } from './connectors/tiktok-connector.service';
import { ShopeeConnectorService } from './connectors/shopee-connector.service';
import { LazadaConnectorService } from './connectors/lazada-connector.service';
import { MarketplaceConnectorResolver } from './marketplace-connector.resolver';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceAccountEntity, OAuthStateEntity]),
    AuthModule,
  ],
  controllers: [MarketplaceController, WebhooksController],
  providers: [
    EncryptionService,
    TikTokConnectorService,
    ShopeeConnectorService,
    LazadaConnectorService,
    MarketplaceConnectorResolver,
    MarketplaceService,
  ],
  exports: [MarketplaceService, EncryptionService],
})
export class MarketplaceModule {}
