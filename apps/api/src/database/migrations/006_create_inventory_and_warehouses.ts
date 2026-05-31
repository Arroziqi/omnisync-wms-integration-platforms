import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateInventoryAndWarehouses1006 implements MigrationInterface {
  name = 'CreateInventoryAndWarehouses1006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. warehouses table
    await queryRunner.createTable(
      new Table({
        name: 'warehouses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'code',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Seed default warehouse
    await queryRunner.query(`
      INSERT INTO warehouses (code, name, address, is_active) VALUES
        ('WH-JKT-01', 'Main Jakarta Warehouse', 'Kawasan Industri Pulogadung, Jakarta Timur', true),
        ('WH-SUB-01', 'Surabaya Hub', 'Rungkut Industri, Surabaya, Jawa Timur', true)
    `);

    // 2. inventories table
    await queryRunner.createTable(
      new Table({
        name: 'inventories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'warehouse_id',
            type: 'uuid',
          },
          {
            name: 'variant_id',
            type: 'uuid',
          },
          {
            name: 'quantity',
            type: 'integer',
            default: 0,
          },
          {
            name: 'reserved',
            type: 'integer',
            default: 0,
          },
          {
            name: 'available',
            type: 'integer',
            default: 0,
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
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'inventories',
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedTableName: 'warehouses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'inventories',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'inventories',
      new TableUnique({
        name: 'UQ_WAREHOUSE_VARIANT',
        columnNames: ['warehouse_id', 'variant_id'],
      }),
    );

    // 3. inventory_movements table
    await queryRunner.createTable(
      new Table({
        name: 'inventory_movements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'warehouse_id',
            type: 'uuid',
          },
          {
            name: 'variant_id',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'quantity_delta',
            type: 'integer',
          },
          {
            name: 'previous_quantity',
            type: 'integer',
          },
          {
            name: 'new_quantity',
            type: 'integer',
          },
          {
            name: 'reference_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
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

    await queryRunner.createForeignKey(
      'inventory_movements',
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedTableName: 'warehouses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_movements',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_movements',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('inventory_movements');
    await queryRunner.dropTable('inventories');
    await queryRunner.dropTable('warehouses');
  }
}
