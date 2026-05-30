import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePermissionsAndRolePermissions1002
  implements MigrationInterface
{
  name = 'CreatePermissionsAndRolePermissions1002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // permissions table
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'key',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // role_permissions join table
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'role_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'permission_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Seed core permissions
    await queryRunner.query(`
      INSERT INTO permissions (key, description) VALUES
        ('users:read',        'Read user list'),
        ('users:write',       'Create and update users'),
        ('users:delete',      'Delete users'),
        ('roles:read',        'Read roles'),
        ('roles:write',       'Create and assign roles'),
        ('marketplace:read',  'View marketplace accounts'),
        ('marketplace:write', 'Connect/disconnect marketplace accounts'),
        ('products:read',     'Read products'),
        ('products:write',    'Create and update products'),
        ('inventory:read',    'Read inventory'),
        ('inventory:write',   'Adjust inventory'),
        ('orders:read',       'Read orders'),
        ('orders:write',      'Update and resync orders'),
        ('sync:read',         'View sync jobs'),
        ('sync:write',        'Retry/cancel sync jobs')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('permissions');
  }
}
