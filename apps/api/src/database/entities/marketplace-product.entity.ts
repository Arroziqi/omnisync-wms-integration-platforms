import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { MarketplaceAccountEntity } from './marketplace-account.entity';

export enum SyncStatus {
  SYNCED = 'synced',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('marketplace_products')
@Unique(['marketplaceAccountId', 'marketplaceProductId', 'marketplaceVariantId'])
export class MarketplaceProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'marketplace_account_id', type: 'uuid' })
  marketplaceAccountId: string;

  @ManyToOne(() => MarketplaceAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketplace_account_id' })
  marketplaceAccount: MarketplaceAccountEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ProductEntity, (product) => product.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'marketplace_product_id', type: 'varchar' })
  marketplaceProductId: string; // Remote item ID

  @Column({ name: 'marketplace_variant_id', type: 'varchar', nullable: true })
  marketplaceVariantId: string | null; // Remote variant ID

  @Column({ type: 'varchar', default: SyncStatus.PENDING })
  syncStatus: SyncStatus;

  @Column({ name: 'last_synced_at', type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
