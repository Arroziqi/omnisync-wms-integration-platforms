import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum MarketplaceType {
  TIKTOK = 'tiktok',
  SHOPEE = 'shopee',
  LAZADA = 'lazada',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  DISCONNECTED = 'disconnected',
}

@Entity('marketplace_accounts')
@Unique(['marketplace', 'sellerId'])
export class MarketplaceAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  marketplace: MarketplaceType;

  @Column({ name: 'seller_id', type: 'varchar' })
  sellerId: string;

  @Column({ name: 'seller_name', type: 'varchar' })
  sellerName: string;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'token_expired_at', type: 'timestamp' })
  tokenExpiredAt: Date;

  @Column({ type: 'varchar', default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
