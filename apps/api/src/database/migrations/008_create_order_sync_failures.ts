import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateOrderSyncFailures1008 implements MigrationInterface {
  name = 'CreateOrderSyncFailures1008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'order_sync_failures',
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
          },
          {
            name: 'customer_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'failed'",
          },
          {
            name: 'retry_count',
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
      'order_sync_failures',
      new TableForeignKey({
        columnNames: ['marketplace_account_id'],
        referencedTableName: 'marketplace_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_sync_failures');
  }
}
