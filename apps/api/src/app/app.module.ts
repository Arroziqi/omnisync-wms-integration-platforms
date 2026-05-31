import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { RolesModule } from '../modules/roles/roles.module';
import { UsersModule } from '../modules/users/users.module';
import { MarketplaceModule } from '../modules/marketplace/marketplace.module';
import { ProductsModule } from '../modules/products/products.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';
import { QueueModule } from '../modules/queue/queue.module';
import { MonitoringModule } from '../modules/monitoring/monitoring.module';
import { AuditModule } from '../modules/audit/audit.module';
import { NotificationModule } from '../modules/notifications/notification.module';
import { SecurityModule } from '../modules/security/security.module';
import databaseConfig from '../config/database.config';
import jwtConfig from '../config/jwt.config';
import { RequestLoggerMiddleware } from '../modules/logger/request-logger.middleware';

@Module({
  imports: [
    // Global config — loads .env and registers namespaced config factories
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // TypeORM — async so it can use ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('database') as ReturnType<typeof databaseConfig>,
    }),

    // Feature modules
    SecurityModule,        // Global rate limiting, security headers (registered first)
    AuthModule,
    RolesModule,
    UsersModule,
    MarketplaceModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    WebhooksModule,
    QueueModule,
    MonitoringModule,
    AuditModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
