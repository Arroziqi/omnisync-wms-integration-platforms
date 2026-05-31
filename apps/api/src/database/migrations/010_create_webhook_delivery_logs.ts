import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateWebhookDeliveryLogs1010 implements MigrationInterface {
  name = 'CreateWebhookDeliveryLogs1010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_delivery_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'webhook_event_id',
            type: 'uuid',
          },
          {
            name: 'action',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'success'",
          },
          {
            name: 'detail',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processing_time_ms',
            type: 'integer',
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
      'webhook_delivery_logs',
      new TableForeignKey({
        columnNames: ['webhook_event_id'],
        referencedTableName: 'webhook_events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_delivery_logs');
  }
}
