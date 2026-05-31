import axios from 'axios';

describe('GET /api/v1', () => {
  it('should return the Hello API message', async () => {
    const res = await axios.get('/');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});
