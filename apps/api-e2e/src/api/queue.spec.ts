import axios from 'axios';
import { Client } from 'pg';

describe('Queue Retry & DLQ Management (E2E)', () => {
  let dbClient: Client;
  let accessToken: string;
  const testAccountId = '88888888-8888-8888-8888-888888888888';
  const testFailedJobId = '77777777-7777-7777-7777-777777777777';
  const testBullJobId = 'bull_job_test_123';

  beforeAll(async () => {
    // 1. Get authenticated admin token
    const loginRes = await axios.post('/auth/login', {
      email: 'admin@omnisync.io',
      password: 'Secret123!',
    });
    accessToken = loginRes.data.access_token;

    // 2. Connect to database and seed test queue and DLQ data
    dbClient = new Client({
      connectionString: 'postgresql://postgres:root@localhost:5432/omnisync_db',
    });
    await dbClient.connect();

    // Cleanup first
    await dbClient.query('DELETE FROM failed_jobs WHERE marketplace_account_id = $1 OR id = $2', [testAccountId, testFailedJobId]);
    await dbClient.query('DELETE FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
    await dbClient.query('DELETE FROM marketplace_accounts WHERE id = $1', [testAccountId]);

    // Insert active marketplace account
    await dbClient.query(
      `INSERT INTO marketplace_accounts (id, marketplace, seller_id, seller_name, status, access_token, refresh_token, token_expired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '1 day')`,
      [testAccountId, 'tiktok', 'seller_queue_test', 'TikTok Queue Test Channel', 'active', 'tok_acc', 'tok_ref'],
    );

    // Insert dummy sync jobs
    await dbClient.query(
      `INSERT INTO sync_jobs (id, marketplace_account_id, "jobType", status, max_attempts, attempt_count)
       VALUES 
       (gen_random_uuid(), $1, 'order_sync', 'completed', 5, 1),
       (gen_random_uuid(), $1, 'bulk_sync', 'failed', 5, 5)`,
      [testAccountId],
    );

    // Insert dummy failed job in DLQ (failed_jobs)
    await dbClient.query(
      `INSERT INTO failed_jobs (id, marketplace_account_id, bull_job_id, marketplace, order_number, final_error, total_attempts, job_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        testFailedJobId,
        testAccountId,
        testBullJobId,
        'tiktok',
        'ORD-FAILED-101',
        'Connection Timeout after 5 retry attempts',
        5,
        JSON.stringify({ accountId: testAccountId, orderNumber: 'ORD-FAILED-101' }),
        'dead',
      ],
    );
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.query('DELETE FROM failed_jobs WHERE marketplace_account_id = $1 OR id = $2', [testAccountId, testFailedJobId]);
      await dbClient.query('DELETE FROM sync_jobs WHERE marketplace_account_id = $1', [testAccountId]);
      await dbClient.query('DELETE FROM marketplace_accounts WHERE id = $1', [testAccountId]);
      await dbClient.end();
    }
  });

  describe('GET /queue/stats', () => {
    it('should return successfully with combined BullMQ + Database queue statistics', async () => {
      const res = await axios.get('/queue/stats', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('queue');
      expect(res.data).toHaveProperty('db');
      expect(res.data.db.totalSyncJobs).toBeGreaterThanOrEqual(2);
      expect(res.data.db.failedJobs).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /queue/failed-jobs (DLQ List)', () => {
    it('should return paginated list of failed-jobs with correct meta and filter options', async () => {
      const res = await axios.get('/queue/failed-jobs', {
        params: { marketplace: 'tiktok', status: 'dead' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(res.data).toHaveProperty('meta');
      expect(Array.isArray(res.data.data)).toBe(true);

      const target = res.data.data.find((x: any) => x.id === testFailedJobId);
      expect(target).toBeDefined();
      expect(target.orderNumber).toBe('ORD-FAILED-101');
      expect(target.status).toBe('dead');
    });
  });

  describe('POST /queue/retry/:jobId', () => {
    it('should re-enqueue a failed job and update database state', async () => {
      const res = await axios.post(`/queue/retry/${testBullJobId}`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.requeued).toBe(true);
      expect(res.data.message).toContain('re-enqueued');

      // Verify DB DLQ record state is marked as retried
      const dbRes = await dbClient.query('SELECT status, retried_at FROM failed_jobs WHERE id = $1', [testFailedJobId]);
      expect(dbRes.rows[0].status).toBe('retried');
      expect(dbRes.rows[0].retried_at).not.toBeNull();
    });
  });

  describe('DELETE /queue/failed-jobs/:id', () => {
    it('should discard and dismiss the DLQ failed job', async () => {
      const res = await axios.delete(`/queue/failed-jobs/${testFailedJobId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.discarded).toBe(true);

      // Verify DB DLQ record is marked as discarded
      const dbRes = await dbClient.query('SELECT status FROM failed_jobs WHERE id = $1', [testFailedJobId]);
      expect(dbRes.rows[0].status).toBe('discarded');
    });
  });
});
