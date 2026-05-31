import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RoleEntity } from '../database/entities/role.entity';
import { PermissionEntity } from '../database/entities/permission.entity';
import { RolePermissionEntity } from '../database/entities/role-permission.entity';
import { UserEntity } from '../database/entities/user.entity';
import { RefreshTokenEntity } from '../database/entities/refresh-token.entity';
import { MarketplaceAccountEntity } from '../database/entities/marketplace-account.entity';
import { OAuthStateEntity } from '../database/entities/oauth-state.entity';
import { ProductEntity } from '../database/entities/product.entity';
import { ProductVariantEntity } from '../database/entities/product-variant.entity';
import { MarketplaceProductEntity } from '../database/entities/marketplace-product.entity';
import { WarehouseEntity } from '../database/entities/warehouse.entity';
import { InventoryEntity } from '../database/entities/inventory.entity';
import { InventoryMovementEntity } from '../database/entities/inventory-movement.entity';
import { OrderEntity } from '../database/entities/order.entity';
import { OrderItemEntity } from '../database/entities/order-item.entity';
import { OrderSyncFailureEntity } from '../database/entities/order-sync-failure.entity';
import { AuditLogEntity } from '../database/entities/audit-log.entity';
import { NotificationEntity } from '../database/entities/notification.entity';
import { WebhookEventEntity } from '../database/entities/webhook-event.entity';
import { WebhookDeliveryLogEntity } from '../database/entities/webhook-delivery-log.entity';
import { SyncJobEntity } from '../database/entities/sync-job.entity';
import { FailedJobEntity } from '../database/entities/failed-job.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserEntity,
      RefreshTokenEntity,
      MarketplaceAccountEntity,
      OAuthStateEntity,
      ProductEntity,
      ProductVariantEntity,
      MarketplaceProductEntity,
      WarehouseEntity,
      InventoryEntity,
      InventoryMovementEntity,
      OrderEntity,
      OrderItemEntity,
      OrderSyncFailureEntity,
      AuditLogEntity,
      NotificationEntity,
      WebhookEventEntity,
      WebhookDeliveryLogEntity,
      SyncJobEntity,
      FailedJobEntity,
    ],
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    migrationsRun: false,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.DB_LOGGING === 'true' ? true : ['error', 'warn'],
  }),
);
