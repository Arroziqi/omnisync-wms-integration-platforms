import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

async function seed() {
  const connectionString = process.env.DATABASE_URL || "postgresql://omnisync:omnisync_secret@localhost:5432/omnisync_db";
  console.log(`Connecting to database for seeding...`);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    // Check if roles exist
    const rolesRes = await client.query("SELECT id FROM roles WHERE name = 'admin'");
    if (rolesRes.rows.length === 0) {
      console.log("No admin role found. Creating roles first...");
      await client.query(`
        INSERT INTO roles (name, description) VALUES
          ('admin', 'Full system access'),
          ('operator', 'Operational access to orders, inventory, and marketplace'),
          ('viewer', 'Read-only access')
        ON CONFLICT DO NOTHING;
      `);
      const retryRoles = await client.query("SELECT id FROM roles WHERE name = 'admin'");
      if (retryRoles.rows.length === 0) {
        console.error("Failed to seed roles.");
        return;
      }
    }
    
    const roleIdRes = await client.query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = roleIdRes.rows[0].id;
    
    // Check if user admin@omnisync.io exists
    const userRes = await client.query("SELECT id FROM users WHERE email = 'admin@omnisync.io'");
    if (userRes.rows.length === 0) {
      console.log("Creating admin@omnisync.io...");
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      await client.query(
        "INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5)",
        ["Admin User", "admin@omnisync.io", passwordHash, adminRoleId, true]
      );
      console.log("admin@omnisync.io seeded successfully!");
    } else {
      console.log("admin@omnisync.io already exists.");
    }
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    await client.end();
  }
}

seed();
