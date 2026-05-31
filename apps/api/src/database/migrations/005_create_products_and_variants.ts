import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateProductsAndVariants1005 implements MigrationInterface {
  name = 'CreateProductsAndVariants1005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. products table
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'sku',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'brand',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'draft'",
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

    // 2. product_variants table
    await queryRunner.createTable(
      new Table({
        name: 'product_variants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'product_id',
            type: 'uuid',
          },
          {
            name: 'variant_name',
            type: 'varchar',
          },
          {
            name: 'variant_sku',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0.00,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'",
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 10,
            scale: 3,
            default: 0.000,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Foreign key for product_variants -> products
    await queryRunner.createForeignKey(
      'product_variants',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. marketplace_products table
    await queryRunner.createTable(
      new Table({
        name: 'marketplace_products',
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
            name: 'product_id',
            type: 'uuid',
          },
          {
            name: 'marketplace_product_id',
            type: 'varchar',
          },
          {
            name: 'marketplace_variant_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sync_status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'last_synced_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Foreign key for marketplace_products -> marketplace_accounts
    await queryRunner.createForeignKey(
      'marketplace_products',
      new TableForeignKey({
        columnNames: ['marketplace_account_id'],
        referencedTableName: 'marketplace_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Foreign key for marketplace_products -> products
    await queryRunner.createForeignKey(
      'marketplace_products',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Unique constraint for marketplace_products
    await queryRunner.createUniqueConstraint(
      'marketplace_products',
      new TableUnique({
        name: 'UQ_MARKETPLACE_PRODUCT_VARIANT',
        columnNames: ['marketplace_account_id', 'marketplace_product_id', 'marketplace_variant_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('marketplace_products');
    await queryRunner.dropTable('product_variants');
    await queryRunner.dropTable('products');
  }
}
