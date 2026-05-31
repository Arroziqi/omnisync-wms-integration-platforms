import axios from 'axios';

describe('API Contract Validation (E2E)', () => {
  let accessToken: string;

  beforeAll(async () => {
    // Acquire administrative token to query all guarded contract endpoints
    const loginRes = await axios.post('/auth/login', {
      email: 'admin@omnisync.io',
      password: 'Secret123!',
    });
    accessToken = loginRes.data.access_token;
  });

  describe('Root Contract', () => {
    it('should return a valid Hello API contract structure', async () => {
      const res = await axios.get('/');
      expect(res.status).toBe(200);
      expect(res.data).toEqual({
        message: expect.any(String),
      });
    });
  });

  describe('Auth User Profile Contract', () => {
    it('should match the exact User profile payload structure', async () => {
      const res = await axios.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        isActive: expect.any(Boolean),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        roleId: expect.any(String),
        permissions: expect.any(Array),
        role: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          createdAt: expect.any(String),
        }),
      }));
    });
  });

  describe('Monitoring Dashboard Metrics Contract', () => {
    it('should match the aggregated KPI dashboard structure', async () => {
      const res = await axios.get('/monitoring/dashboard', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data).toEqual({
        orders: {
          totalToday: expect.any(Number),
          totalAll: expect.any(Number),
        },
        syncJobs: {
          pending: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          dead: expect.any(Number),
        },
        webhooks: {
          totalToday: expect.any(Number),
          processed: expect.any(Number),
          failed: expect.any(Number),
        },
        marketplace: {
          activeAccounts: expect.any(Number),
          totalAccounts: expect.any(Number),
          expiredAccounts: expect.any(Number),
        },
        failedOrders: {
          total: expect.any(Number),
          pending: expect.any(Number),
        },
      });
    });
  });

  describe('Error Responses Contract', () => {
    it('should match the standard NestJS/OmniSync validation error contract', async () => {
      try {
        await axios.post('/auth/login', {
          invalid_property: 'not_expected_by_validation_pipe',
        });
        fail('Should have failed validation');
      } catch (err: any) {
        expect(err.response.status).toBe(400);
        expect(err.response.data).toEqual({
          statusCode: 400,
          message: expect.anything(),
          error: 'Bad Request',
        });
      }
    });
  });
});
