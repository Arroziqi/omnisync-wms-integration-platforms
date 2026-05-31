import axios from 'axios';

describe('Auth & RBAC (E2E)', () => {
  let accessToken: string;
  let refreshToken: string;

  describe('POST /auth/login', () => {
    it('should reject login with invalid credentials', async () => {
      try {
        await axios.post('/auth/login', {
          email: 'admin@omnisync.io',
          password: 'WrongPassword123!',
        });
        fail('Should have failed with 401');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
        expect(err.response.data.message).toContain('Invalid credentials');
      }
    });

    it('should successfully login and return JWT tokens', async () => {
      const res = await axios.post('/auth/login', {
        email: 'admin@omnisync.io',
        password: 'Secret123!',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('access_token');
      expect(res.data).toHaveProperty('refresh_token');

      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;
    });
  });

  describe('GET /auth/me', () => {
    it('should reject profile fetching without token', async () => {
      try {
        await axios.get('/auth/me');
        fail('Should have failed with 401');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
      }
    });

    it('should successfully fetch profile with valid access token', async () => {
      const res = await axios.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.email).toBe('admin@omnisync.io');
      expect(res.data).toHaveProperty('role');
      expect(res.data.role.name).toBe('admin');
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('should reject invalid or malformed refresh token', async () => {
      try {
        await axios.post('/auth/refresh-token', {
          refresh_token: 'invalid-refresh-token',
        });
        fail('Should have failed with 401');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
      }
    });

    it('should successfully refresh access token with valid refresh token', async () => {
      const res = await axios.post('/auth/refresh-token', {
        refresh_token: refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('access_token');

      // Update the access token for subsequent tests
      accessToken = res.data.access_token;
    });
  });

  describe('RBAC Authorization Guards', () => {
    it('should allow admin user to read user lists', async () => {
      const res = await axios.get('/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.some((u: any) => u.email === 'admin@omnisync.io')).toBe(true);
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout and invalidate refresh token', async () => {
      const res = await axios.post(
        '/auth/logout',
        { refresh_token: refreshToken },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(res.status).toBe(204);
    });

    it('should reject refresh-token exchange after logout', async () => {
      try {
        await axios.post('/auth/refresh-token', {
          refresh_token: refreshToken,
        });
        fail('Should have failed after logout');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
      }
    });
  });
});
