import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('app', () => {
  const app = createApp();

  it('rejects invalid JSON bodies as client errors', async () => {
    const response = await request(app).post('/api/download').type('json').send('{');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body.');
    expect(response.body.code).toBe('INVALID_INPUT');
  });

  it('rejects oversized JSON bodies as client errors', async () => {
    const response = await request(app)
      .post('/api/download')
      .send({
        url: 'https://soundcloud.com/artist/track',
        lyrics: 'x'.repeat(70 * 1024),
      });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('Request body is too large.');
    expect(response.body.code).toBe('INVALID_INPUT');
  });

  it('returns health status at /health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('sends security headers and no CORS headers', async () => {
    const response = await request(app).get('/health').set('Origin', 'https://attacker.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('returns truthful not-found responses for probes and unknown API routes', async () => {
    const [secretProbe, phpProbe, apiProbe] = await Promise.all([
      request(app).get('/.env'),
      request(app).get('/vendor/phpunit/eval-stdin.php'),
      request(app).get('/api/unknown'),
    ]);

    expect(secretProbe.status).toBe(404);
    expect(phpProbe.status).toBe(404);
    expect(apiProbe.status).toBe(404);
    expect(apiProbe.body).toEqual({
      error: 'API route not found.',
      code: 'NOT_FOUND',
    });
  });
});
