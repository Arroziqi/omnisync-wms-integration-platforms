import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateOrdersAndOrderItems1007 implements MigrationInterface {
  name = 'CreateOrdersAndOrderItems1007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'marketplace_account_id',
            type: 'uuid',
          },
          {
            name: 'order_number',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'customer_name',
            type: 'varchar',
          },
          {
            name: 'customer_phone',
            type: 'varchar',
          },
          {
            name: 'customer_address',
            type: 'text',
          },
          {
            name: 'order_status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'payment_status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0.00,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'IDR'",
          },
          {
            name: 'marketplace_created_at',
            type: 'timestamp',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['marketplace_account_id'],
        referencedTableName: 'marketplace_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 2. order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'order_id',
            type: 'uuid',
          },
          {
            name: 'product_variant_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'product_name',
            type: 'varchar',
          },
          {
            name: 'quantity',
            type: 'integer',
            default: 1,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0.00,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0.00,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['product_variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_items');
    await queryRunner.dropTable('orders');
  }
}
