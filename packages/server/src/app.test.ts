import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('API validation', () => {
  const app = createApp();

  it('rejects requests without a userId', async () => {
    const response = await request(app).get('/api/soundcloud/users');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
    expect(response.body.code).toBe('INVALID_INPUT');
  });

  it('does not expose provider-specific users and favorites as common routes', async () => {
    const [usersResponse, favoritesResponse] = await Promise.all([
      request(app).get('/api/users').query({ userId: '123' }),
      request(app).get('/api/favorites').query({ userId: '123' }),
    ]);

    expect(usersResponse.status).toBe(404);
    expect(favoritesResponse.status).toBe(404);
  });

  it('rejects malformed download payloads', async () => {
    const response = await request(app).post('/api/download').send({
      url: 'not-a-url',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
    expect(response.body.code).toBe('INVALID_INPUT');
  });

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

  it('rejects unsupported source URLs early', async () => {
    const [soundCloudResponse, youTubeResponse, genericTrackResponse, downloadResponse] = await Promise.all([
      request(app).get('/api/soundcloud/tracks').query({
        url: 'https://example.com/track',
      }),
      request(app).get('/api/youtube/tracks').query({
        url: 'https://example.com/video',
      }),
      request(app).get('/api/tracks').query({
        url: 'https://example.com/video',
      }),
      request(app).post('/api/download').send({
        url: 'https://example.com/audio',
      }),
    ]);

    expect(soundCloudResponse.status).toBe(400);
    expect(soundCloudResponse.body.error).toBe('Unsupported URL source. Use a SoundCloud link.');
    expect(soundCloudResponse.body.code).toBe('UNSUPPORTED_SOURCE');

    expect(youTubeResponse.status).toBe(400);
    expect(youTubeResponse.body.error).toBe('Unsupported URL source. Use a YouTube link.');
    expect(youTubeResponse.body.code).toBe('UNSUPPORTED_SOURCE');

    expect(genericTrackResponse.status).toBe(400);
    expect(genericTrackResponse.body.error).toBe('Unsupported URL source. Use a SoundCloud or YouTube link.');
    expect(genericTrackResponse.body.code).toBe('UNSUPPORTED_SOURCE');

    expect(downloadResponse.status).toBe(400);
    expect(downloadResponse.body.error).toBe('Unsupported URL source. Use a SoundCloud or YouTube link.');
    expect(downloadResponse.body.code).toBe('UNSUPPORTED_SOURCE');
  });

  it('returns health status at /health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
  });

  it('returns readiness details at /ready', async () => {
    const readinessApp = createApp({
      getReadiness: async () => ({
        status: 'error',
        checks: {
          ffmpeg: {
            ok: false,
            details: 'missing',
          },
          server: {
            ok: true,
          },
          tempDir: {
            ok: true,
          },
          ytDlp: {
            ok: true,
          },
        },
      }),
    });
    const response = await request(readinessApp).get('/ready');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.checks.ffmpeg.ok).toBe(false);
    expect(response.body.checks.ffmpeg.details).toBe('missing');
  });
});
