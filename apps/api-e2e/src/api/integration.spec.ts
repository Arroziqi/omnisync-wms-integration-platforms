import axios from 'axios';
import { Client } from 'pg';

describe('Multi-Service E2E Integration Workflows', () => {
  let dbClient: Client;
  let accessToken: string;
  const testAccountId = '55555555-5555-5555-5555-555555555555';
  const testOrderId = '44444444-4444-4444-4444-444444444444';
  const testOrderNum = 'ORD-INTEG-E2E';

  beforeAll(async () => {
    // 1. Get authenticated administrative credentials
    const loginRes = await axios.post('/auth/login', {
      email: 'admin@omnisync.io',
      password: 'Secret123!',
    });
    accessToken = loginRes.data.access_token;

    // 2. Setup testing database state
    dbClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/omnisync_db',
    });
    await dbClient.connect();

    // Clean any remnants first
    await dbClient.query('DELETE FROM order_sync_failures WHERE marketplace_account_id = $1', [testAccountId]);
    await dbClient.query('DELETE FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
    await dbClient.query('DELETE FROM order_items WHERE order_id = $1', [testOrderId]);
    await dbClient.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    await dbClient.query('DELETE FROM marketplace_accounts WHERE id = $1', [testAccountId]);

    // Insert active test marketplace account
    await dbClient.query(
      `INSERT INTO marketplace_accounts (id, marketplace, seller_id, seller_name, status, access_token, refresh_token, token_expired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '1 day')`,
      [testAccountId, 'tiktok', 'seller_integ_test', 'TikTok Integration Channel', 'active', 'integ_acc', 'integ_ref'],
    );

    // Insert mock order to trigger manual resync on
    await dbClient.query(
      `INSERT INTO orders (id, marketplace_account_id, order_number, customer_name, customer_phone, customer_address, order_status, total_amount, currency, marketplace_created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 125.50, 'USD', NOW())`,
      [testOrderId, testAccountId, testOrderNum, 'Integ Customer', '0812345678', '123 Integ Lane', 'pending'],
    );
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.query('DELETE FROM order_sync_failures WHERE marketplace_account_id = $1', [testAccountId]);
      await dbClient.query('DELETE FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
      await dbClient.query('DELETE FROM order_items WHERE order_id = $1', [testOrderId]);
      await dbClient.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
      await dbClient.query('DELETE FROM marketplace_accounts WHERE id = $1', [testAccountId]);
      await dbClient.end();
    }
  });

  // Polling helper to await background async DB inserts
  async function waitForSyncJob(
    accountId: string,
    jobType: string,
    orderNumber?: string,
  ): Promise<any[]> {
    for (let i = 0; i < 20; i++) {
      let queryStr = `SELECT * FROM sync_jobs WHERE marketplace_account_id = $1 AND "jobType" = $2`;
      const params = [accountId, jobType];
      if (orderNumber) {
        queryStr += ` AND order_number = $3`;
        params.push(orderNumber);
      }
      const res = await dbClient.query(queryStr, params);
      if (res.rows.length > 0) {
        return res.rows;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return [];
  }

  describe('POST /orders/sync-all (Bulk Store Sync)', () => {
    it('should successfully trigger bulk store synchronization and register sync jobs in DB', async () => {
      const res = await axios.post('/orders/sync-all', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.message).toContain('enqueued order synchronization');

      // Verify that a bulk sync job was registered in the database
      const rows = await waitForSyncJob(testAccountId, 'bulk_sync');
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0].status).toBe('pending');
    });
  });

  describe('POST /orders/:id/resync (Manual Order Sync)', () => {
    it('should successfully trigger manual single order sync and register order_sync job in DB', async () => {
      const res = await axios.post(`/orders/${testOrderId}/resync`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.message).toContain('Manual synchronization enqueued');

      // Verify that an order specific sync job was registered in the database
      const rows = await waitForSyncJob(testAccountId, 'order_sync', testOrderNum);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('pending');
    });
  });

  describe('POST /orders/failed/bulk-resync (Bulk Failed Retry)', () => {
    it('should successfully call bulk resync on failed logs', async () => {
      const res = await axios.post('/orders/failed/bulk-resync', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });
});
