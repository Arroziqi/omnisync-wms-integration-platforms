import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * AuditLogEntity
 *
 * Persistent record of every significant system action. Written by
 * AuditInterceptor (HTTP layer) and AuditService (programmatic layer).
 *
 * Keeps a denormalised actor_email so that log records remain readable
 * even after the associated user has been deleted.
 */
@Entity('audit_logs')
@Index(['actorId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * UUID of the authenticated user who triggered the action.
   * NULL for automated system-initiated events.
   */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  /**
   * Denormalized email of the actor for readability without joins.
   */
  @Column({ name: 'actor_email', type: 'varchar', nullable: true })
  actorEmail: string | null;

  /**
   * Dot-namespaced action identifier, e.g. "user.login", "order.resync".
   */
  @Column({ type: 'varchar' })
  action: string;

  /**
   * Domain object type affected, e.g. "order", "marketplace_account", "user".
   */
  @Column({ name: 'resource_type', type: 'varchar', nullable: true })
  resourceType: string | null;

  /**
   * UUID or identifier of the specific resource affected.
   */
  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId: string | null;

  /**
   * Arbitrary JSON context — request params, changed fields, old/new values.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Client IPv4/v6 address extracted from request headers.
   */
  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  /**
   * HTTP User-Agent string from the client.
   */
  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  /**
   * Outcome of the action — success or failure.
   */
  @Column({ type: 'varchar', default: AuditStatus.SUCCESS })
  status: AuditStatus;

  /**
   * Error message populated when status = failure.
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
