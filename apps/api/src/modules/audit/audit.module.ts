import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditController } from './audit.controller';
import { AuthModule } from '../auth/auth.module';

/**
 * AuditModule
 *
 * Provides AuditService and AuditInterceptor globally.
 * AuditService is exported so it can be injected into any feature module
 * that needs to write programmatic audit entries without importing this module
 * repeatedly (import AuditModule once in AppModule is sufficient).
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLogEntity]),
    AuthModule,
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
