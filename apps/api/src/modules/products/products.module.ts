import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductSyncService } from './product-sync.service';
import { ProductSyncQueueService } from './product-sync-queue.service';
import { ProductEntity } from '../../database/entities/product.entity';
import { ProductVariantEntity } from '../../database/entities/product-variant.entity';
import { MarketplaceProductEntity } from '../../database/entities/marketplace-product.entity';
import { MarketplaceAccountEntity } from '../../database/entities/marketplace-account.entity';
import { AuthModule } from '../auth/auth.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductVariantEntity,
      MarketplaceProductEntity,
      MarketplaceAccountEntity,
    ]),
    AuthModule,
    MarketplaceModule,
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductSyncService,
    ProductSyncQueueService,
  ],
  exports: [
    ProductsService,
    ProductSyncService,
    ProductSyncQueueService,
  ],
})
export class ProductsModule {}
