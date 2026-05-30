import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';

export class CreateMarketplaceAccountsAndOAuthStates1004
  implements MigrationInterface
{
  name = 'CreateMarketplaceAccountsAndOAuthStates1004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // marketplace_accounts table
    await queryRunner.createTable(
      new Table({
        name: 'marketplace_accounts',
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
          },
          {
            name: 'seller_name',
            type: 'varchar',
          },
          {
            name: 'access_token',
            type: 'text',
          },
          {
            name: 'refresh_token',
            type: 'text',
          },
          {
            name: 'token_expired_at',
            type: 'timestamp',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
          },
          {
            name: 'created_by',
            type: 'uuid',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create unique constraint on (marketplace, seller_id)
    await queryRunner.createUniqueConstraint(
      'marketplace_accounts',
      new TableUnique({
        name: 'UQ_MARKETPLACE_SELLER',
        columnNames: ['marketplace', 'seller_id'],
      }),
    );

    // Create foreign key to users
    await queryRunner.createForeignKey(
      'marketplace_accounts',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // oauth_states table
    await queryRunner.createTable(
      new Table({
        name: 'oauth_states',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'state',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'marketplace',
            type: 'varchar',
          },
          {
            name: 'expired_at',
            type: 'timestamp',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('oauth_states');
    await queryRunner.dropTable('marketplace_accounts');
  }
}
