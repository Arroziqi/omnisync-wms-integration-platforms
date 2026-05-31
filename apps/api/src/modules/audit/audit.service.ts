import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity, AuditStatus } from '../../database/entities/audit-log.entity';

export interface CreateAuditLogDto {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: AuditStatus;
  errorMessage?: string | null;
}

export interface AuditLogPage {
  data: AuditLogEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * AuditService
 *
 * Central service for writing and querying the persistent audit log.
 * Exported from AuditModule so it can be injected into any other module
 * or interceptor without circular dependencies.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  /**
   * Writes a new audit log entry. Never throws — failures are logged only.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        actorId: dto.actorId ?? null,
        actorEmail: dto.actorEmail ?? null,
        action: dto.action,
        resourceType: dto.resourceType ?? null,
        resourceId: dto.resourceId ?? null,
        metadata: dto.metadata ?? null,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
        status: dto.status ?? AuditStatus.SUCCESS,
        errorMessage: dto.errorMessage ?? null,
      });
      await this.auditRepo.save(entry);
    } catch (err) {
      this.logger.error(`[AUDIT] Failed to write log entry for action "${dto.action}": ${err.message}`);
    }
  }

  /**
   * Returns paginated, filterable audit log entries.
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    actorId?: string;
    action?: string;
    resourceType?: string;
    status?: AuditStatus;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<AuditLogPage> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.auditRepo
      .createQueryBuilder('al')
      .skip(skip)
      .take(limit)
      .orderBy('al.createdAt', 'DESC');

    if (options.actorId) {
      qb.andWhere('al.actorId = :actorId', { actorId: options.actorId });
    }
    if (options.action) {
      qb.andWhere('al.action = :action', { action: options.action });
    }
    if (options.resourceType) {
      qb.andWhere('al.resourceType = :resourceType', { resourceType: options.resourceType });
    }
    if (options.status) {
      qb.andWhere('al.status = :status', { status: options.status });
    }
    if (options.from && options.to) {
      qb.andWhere('al.createdAt BETWEEN :from AND :to', {
        from: new Date(options.from),
        to: new Date(options.to),
      });
    } else if (options.from) {
      qb.andWhere('al.createdAt >= :from', { from: new Date(options.from) });
    } else if (options.to) {
      qb.andWhere('al.createdAt <= :to', { to: new Date(options.to) });
    }
    if (options.search) {
      qb.andWhere(
        '(al.actorEmail ILIKE :search OR al.action ILIKE :search OR al.resourceId ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Returns the distinct action names recorded in the log (for filter dropdowns).
   */
  async getDistinctActions(): Promise<string[]> {
    const rows = await this.auditRepo
      .createQueryBuilder('al')
      .select('DISTINCT al.action', 'action')
      .orderBy('al.action', 'ASC')
      .getRawMany<{ action: string }>();
    return rows.map((r) => r.action);
  }
}
