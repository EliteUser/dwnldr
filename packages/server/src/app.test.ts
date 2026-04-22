import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('API validation', () => {
  const app = createApp();

  it('rejects requests without a userId', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
  });

  it('rejects malformed download payloads', async () => {
    const response = await request(app).post('/api/download').send({
      url: 'not-a-url',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
  });
});
