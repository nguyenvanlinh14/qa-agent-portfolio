import { test, expect } from '../fixtures';

test.describe('GET /api/health', () => {
  test('@smoke reports the service as ok', async ({ api }) => {
    const res = await api.health();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body?.uptime).toBeGreaterThan(0);
  });
});
