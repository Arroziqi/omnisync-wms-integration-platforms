import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookEventEntity } from '../../database/entities/webhook-event.entity';
import { WebhookDeliveryLogEntity } from '../../database/entities/webhook-delivery-log.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebhookEventEntity,
      WebhookDeliveryLogEntity,
      MarketplaceAccountEntity,
    ]),
    AuthModule,
    OrdersModule,
    NotificationModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhooksModule {}
