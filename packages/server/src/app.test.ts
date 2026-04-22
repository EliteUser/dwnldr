import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('API validation', () => {
  const app = createApp();

  it('rejects requests without a userId', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
    expect(response.body.code).toBe('INVALID_INPUT');
  });

  it('rejects malformed download payloads', async () => {
    const response = await request(app).post('/api/download').send({
      url: 'not-a-url',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
    expect(response.body.code).toBe('INVALID_INPUT');
  });

  it('rejects unsupported source URLs early', async () => {
    const [soundCloudResponse, youTubeResponse, downloadResponse] = await Promise.all([
      request(app).get('/api/soundcloud/tracks').query({
        url: 'https://example.com/track',
      }),
      request(app).get('/api/youtube/tracks').query({
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

    expect(downloadResponse.status).toBe(400);
    expect(downloadResponse.body.error).toBe('Unsupported URL source. Use a SoundCloud or YouTube link.');
    expect(downloadResponse.body.code).toBe('UNSUPPORTED_SOURCE');
  });
});
