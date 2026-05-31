import { waitForPortOpen } from '@nx/node/utils';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  // Enforce consistent admin credentials state in DB
  const dbClient = new Client({
    connectionString: 'postgresql://postgres:root@localhost:5432/omnisync_db',
  });
  try {
    await dbClient.connect();
    
    // Ensure roles exist
    await dbClient.query(`
      INSERT INTO roles (name, description) VALUES
        ('admin', 'Full system access'),
        ('operator', 'Operational access to orders, inventory, and marketplace'),
        ('viewer', 'Read-only access')
      ON CONFLICT DO NOTHING;
    `);

    const roleRes = await dbClient.query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = roleRes.rows[0].id;
    const passwordHash = await bcrypt.hash('Secret123!', 10);

    // Upsert admin user
    const userRes = await dbClient.query("SELECT id FROM users WHERE email = 'admin@omnisync.io'");
    if (userRes.rows.length === 0) {
      await dbClient.query(
        "INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5)",
        ["Admin User", "admin@omnisync.io", passwordHash, adminRoleId, true]
      );
      console.log('Seeded fresh E2E admin user successfully.');
    } else {
      await dbClient.query(
        "UPDATE users SET password_hash = $1, role_id = $2, is_active = true WHERE email = 'admin@omnisync.io'",
        [passwordHash, adminRoleId]
      );
      console.log('Updated existing admin user credentials for E2E consistency.');
    }
  } catch (err: any) {
    console.error('Error during global-setup DB seeding:', err.message);
  } finally {
    await dbClient.end();
  }

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : (process.env.API_PORT ? Number(process.env.API_PORT) : 3001);
  await waitForPortOpen(port, { host });

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
