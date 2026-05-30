import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { RolesModule } from '../modules/roles/roles.module';
import { UsersModule } from '../modules/users/users.module';
import { MarketplaceModule } from '../modules/marketplace/marketplace.module';
import databaseConfig from '../config/database.config';
import jwtConfig from '../config/jwt.config';

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
    AuthModule,
    RolesModule,
    UsersModule,
    MarketplaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
