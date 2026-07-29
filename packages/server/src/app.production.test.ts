import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('production app security', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not emit cross-origin access headers in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { createApp } = await import('./app.js');

    const response = await request(createApp()).get('/health').set('Origin', 'https://attacker.example');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['strict-transport-security']).toBeUndefined();
    expect(response.headers['x-frame-options']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBeUndefined();
    expect(response.headers['referrer-policy']).toBeUndefined();
  }, 10_000);
});
