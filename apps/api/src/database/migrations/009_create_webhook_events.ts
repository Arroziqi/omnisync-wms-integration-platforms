import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWebhookEvents1009 implements MigrationInterface {
  name = 'CreateWebhookEvents1009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'marketplace',
            type: 'varchar',
          },
          {
            name: 'seller_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            default: "'unknown'",
          },
          {
            name: 'raw_event_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
          },
          {
            name: 'signature_header',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
          },
          {
            name: 'received_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'received'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
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

    // Unique idempotency index: marketplace + idempotency_key guarantees
    // one event record per unique delivery, enabling replay attack prevention.
    await queryRunner.createIndex(
      'webhook_events',
      new TableIndex({
        name: 'UQ_webhook_events_marketplace_idempotency',
        columnNames: ['marketplace', 'idempotency_key'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_events');
  }
}
