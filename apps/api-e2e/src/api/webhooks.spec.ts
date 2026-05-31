import axios from 'axios';
import { Client } from 'pg';

describe('Webhook Processing Security & Safeguards (E2E)', () => {
  let dbClient: Client;
  const testAccountId = '99999999-9999-9999-9999-999999999999';
  const testSellerId = 'seller_e2e_test';

  beforeAll(async () => {
    // Setup clean database state for E2E tests
    dbClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/omnisync_db',
    });
    await dbClient.connect();

    // Clean up any remnants first
    await dbClient.query('DELETE FROM order_sync_failures WHERE marketplace_account_id = $1', [testAccountId]);
    await dbClient.query('DELETE FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
    await dbClient.query('DELETE FROM marketplace_accounts WHERE id = $1', [testAccountId]);

    // Insert an active test marketplace account
    await dbClient.query(
      `INSERT INTO marketplace_accounts (id, marketplace, seller_id, seller_name, status, access_token, refresh_token, token_expired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '1 day')`,
      [testAccountId, 'tiktok', testSellerId, 'TikTok Test Account', 'active', 'test_access', 'test_refresh'],
    );
  });

  afterAll(async () => {
    // Cleanup created testing data
    if (dbClient) {
      await dbClient.query('DELETE FROM order_sync_failures WHERE marketplace_account_id = $1', [testAccountId]);
      await dbClient.query('DELETE FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
      await dbClient.query('DELETE FROM marketplace_accounts WHERE id = $1', [testAccountId]);
      await dbClient.end();
    }
  });

  describe('Replay Attack Prevention', () => {
    it('should reject webhook payloads with stale timestamps (>5 minutes old)', async () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - 400; // 6.6 minutes ago
      const payload = {
        type: 'order_create',
        shop_id: testSellerId,
        timestamp: staleTimestamp,
        message_id: `msg_stale_${Date.now()}`,
        data: { order_id: 'ORD-STALE-E2E' },
      };

      try {
        await axios.post('/webhooks/tiktok', payload, {
          headers: {
            'x-tiktok-signature': 'simulated',
            'x-tiktok-timestamp': String(staleTimestamp),
          },
        });
        fail('Should have failed due to replay attack check');
      } catch (err: any) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.message).toContain('replay attack prevention');
      }
    });
  });

  describe('Signature Validation Security', () => {
    it('should reject webhooks with an invalid signature', async () => {
      const freshTimestamp = Math.floor(Date.now() / 1000);
      const payload = {
        type: 'order_create',
        shop_id: testSellerId,
        timestamp: freshTimestamp,
        message_id: `msg_sig_${Date.now()}`,
        data: { order_id: 'ORD-SIG-E2E' },
      };

      try {
        await axios.post('/webhooks/tiktok', payload, {
          headers: {
            'x-tiktok-signature': 'invalid-hmac-sig',
            'x-tiktok-timestamp': String(freshTimestamp),
          },
        });
        fail('Should have failed due to invalid signature');
      } catch (err: any) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.message).toContain('signature validation failed');
      }
    });
  });

  describe('State Transition & Inactive Account Safeguards', () => {
    it('should ignore webhooks from unknown or inactive seller accounts', async () => {
      const freshTimestamp = Math.floor(Date.now() / 1000);
      const payload = {
        type: 'order_create',
        shop_id: 'unknown_inactive_seller',
        timestamp: freshTimestamp,
        message_id: `msg_inactive_${Date.now()}`,
        data: { order_id: 'ORD-INACTIVE-E2E' },
      };

      const res = await axios.post('/webhooks/tiktok', payload, {
        headers: {
          'x-tiktok-signature': 'simulated',
          'x-tiktok-timestamp': String(freshTimestamp),
        },
      });

      expect(res.status).toBe(200);
      expect(res.data.received).toBe(true);
      expect(res.data.message).toContain('IGNORED');

      // Verify no job was created in DB
      const jobsRes = await dbClient.query('SELECT * FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
      expect(jobsRes.rows.length).toBe(0);
    });
  });

  describe('Successful Processing & Idempotency / Duplicate Prevention', () => {
    const messageId = `msg_success_${Date.now()}`;
    const orderId = 'ORD-SUCCESS-E2E';

    it('should successfully receive valid webhook, persist sync job in DB, and ignore duplication', async () => {
      const freshTimestamp = Math.floor(Date.now() / 1000);
      const payload = {
        type: 'order_create',
        shop_id: testSellerId,
        timestamp: freshTimestamp,
        message_id: messageId,
        data: { order_id: orderId },
      };

      // 1. First webhook post — expects successful processing
      const res1 = await axios.post('/webhooks/tiktok', payload, {
        headers: {
          'x-tiktok-signature': 'simulated',
          'x-tiktok-timestamp': String(freshTimestamp),
        },
      });

      expect(res1.status).toBe(200);
      expect(res1.data.received).toBe(true);

      // Verify a sync job record was created in the database
      const jobsRes1 = await dbClient.query('SELECT * FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
      expect(jobsRes1.rows.length).toBe(1);
      expect(jobsRes1.rows[0].order_number).toBe(orderId);
      expect(jobsRes1.rows[0].status).toBe('pending');

      // 2. Second webhook post with duplicate message_id — expects graceful ignore
      const res2 = await axios.post('/webhooks/tiktok', payload, {
        headers: {
          'x-tiktok-signature': 'simulated',
          'x-tiktok-timestamp': String(freshTimestamp),
        },
      });

      expect(res2.status).toBe(200);
      expect(res2.data.received).toBe(true);
      expect(res2.data.message).toContain('Duplicate event ignored');

      // Verify no extra sync job was created
      const jobsRes2 = await dbClient.query('SELECT * FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
      expect(jobsRes2.rows.length).toBe(1);
    });
  });
});
