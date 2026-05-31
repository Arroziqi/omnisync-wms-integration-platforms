import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';

@Entity('product_variants')
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ProductEntity, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'variant_name', type: 'varchar' })
  variantName: string; // e.g. "Red / XL"

  @Column({ name: 'variant_sku', type: 'varchar', unique: true })
  variantSku: string; // Unique WMS item SKU

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  price: number;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0.000 })
  weight: number; // in KG

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
