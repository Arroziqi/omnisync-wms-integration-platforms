import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarketplaceAccountEntity } from './marketplace-account.entity';

export enum SyncFailureStatus {
  FAILED = 'failed',
  RETRYING = 'retrying',
  RESOLVED = 'resolved',
}

@Entity('order_sync_failures')
export class OrderSyncFailureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'marketplace_account_id', type: 'uuid' })
  marketplaceAccountId: string;

  @ManyToOne(() => MarketplaceAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketplace_account_id' })
  marketplaceAccount: MarketplaceAccountEntity;

  @Column({ name: 'order_number', type: 'varchar' })
  orderNumber: string;

  @Column({ name: 'customer_name', type: 'varchar', nullable: true })
  customerName: string;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage: string;

  @Column({ type: 'varchar', default: SyncFailureStatus.FAILED })
  status: SyncFailureStatus;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
