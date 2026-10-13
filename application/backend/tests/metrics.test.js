const request = require('supertest');
const createApp = require('../src/app');

describe('GET /metrics', () => {
  it('exposes Prometheus metrics including the request histogram', async () => {
    const app = createApp();
    await request(app).get('/healthz');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('process_cpu_user_seconds_total');
    expect(res.text).toContain('route="/healthz"');
  });
});
