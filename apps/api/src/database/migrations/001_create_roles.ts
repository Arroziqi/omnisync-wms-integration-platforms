import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRoles1001 implements MigrationInterface {
  name = 'CreateRoles1001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
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

    // Seed default roles
    await queryRunner.query(`
      INSERT INTO roles (name, description) VALUES
        ('admin', 'Full system access'),
        ('operator', 'Operational access to orders, inventory, and marketplace'),
        ('viewer', 'Read-only access')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('roles');
  }
}
