import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RoleEntity } from '../database/entities/role.entity';
import { PermissionEntity } from '../database/entities/permission.entity';
import { RolePermissionEntity } from '../database/entities/role-permission.entity';
import { UserEntity } from '../database/entities/user.entity';
import { RefreshTokenEntity } from '../database/entities/refresh-token.entity';
import { MarketplaceAccountEntity } from '../database/entities/marketplace-account.entity';
import { OAuthStateEntity } from '../database/entities/oauth-state.entity';

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
    ],
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    migrationsRun: false,
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
  }),
);
