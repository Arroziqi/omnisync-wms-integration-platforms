import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarketplaceAccountEntity } from './marketplace-account.entity';
import { OrderItemEntity } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'marketplace_account_id', type: 'uuid' })
  marketplaceAccountId: string;

  @ManyToOne(() => MarketplaceAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketplace_account_id' })
  marketplaceAccount: MarketplaceAccountEntity;

  @Column({ name: 'order_number', type: 'varchar', unique: true })
  orderNumber: string;

  @Column({ name: 'customer_name', type: 'varchar' })
  customerName: string;

  @Column({ name: 'customer_phone', type: 'varchar' })
  customerPhone: string;

  @Column({ name: 'customer_address', type: 'text' })
  customerAddress: string;

  @Column({ name: 'order_status', type: 'varchar', default: OrderStatus.PENDING })
  orderStatus: OrderStatus;

  @Column({ name: 'payment_status', type: 'varchar', default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  totalAmount: number;

  @Column({ type: 'varchar', default: 'IDR' })
  currency: string;

  @Column({ name: 'marketplace_created_at', type: 'timestamp' })
  marketplaceCreatedAt: Date;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items: OrderItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
