import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WarehouseEntity } from './warehouse.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { UserEntity } from './user.entity';

export enum MovementType {
  ADJUSTMENT = 'adjustment',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  SALE = 'sale',
  RETURN = 'return',
  RECEIPT = 'receipt',
}

@Entity('inventory_movements')
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: WarehouseEntity;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId: string;

  @ManyToOne(() => ProductVariantEntity)
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariantEntity;

  @Column({ type: 'varchar' })
  type: MovementType;

  @Column({ name: 'quantity_delta', type: 'integer' })
  quantityDelta: number;

  @Column({ name: 'previous_quantity', type: 'integer' })
  previousQuantity: number;

  @Column({ name: 'new_quantity', type: 'integer' })
  newQuantity: number;

  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
