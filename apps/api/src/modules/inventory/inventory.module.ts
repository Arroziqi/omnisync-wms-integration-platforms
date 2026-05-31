import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventorySyncQueueService } from './inventory-sync-queue.service';
import { WarehouseEntity } from '../../database/entities/warehouse.entity';
import { InventoryEntity } from '../../database/entities/inventory.entity';
import { InventoryMovementEntity } from '../../database/entities/inventory-movement.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { MarketplaceProductEntity } from '../../database/entities/marketplace-product.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { RolePermissionEntity } from '../../database/entities/role-permission.entity';
import { AuthModule } from '../auth/auth.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseEntity,
      InventoryEntity,
      InventoryMovementEntity,
      ProductVariantEntity,
      MarketplaceProductEntity,
      MarketplaceAccountEntity,
      RoleEntity,
      RolePermissionEntity,
    ]),
    AuthModule,
    MarketplaceModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventorySyncQueueService],
  exports: [InventoryService, InventorySyncQueueService],
})
export class InventoryModule {}
