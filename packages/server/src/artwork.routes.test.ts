import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from './errors/http-error.js';

const fetchRemoteArtworkMock = vi.fn();

vi.mock('./services/artwork/remote-artwork.service.js', () => ({
  fetchRemoteArtwork: fetchRemoteArtworkMock,
}));

const { createApp } = await import('./app.js');

describe('artwork route', () => {
  beforeEach(() => {
    fetchRemoteArtworkMock.mockResolvedValue({
      buffer: Buffer.from([1, 2, 3]),
      mimeType: 'image/png',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('proxies a remote artwork URL as same-origin image bytes', async () => {
    const response = await request(createApp()).get('/api/artwork').query({
      url: 'https://img.example.test/cover.png',
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.body).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchRemoteArtworkMock).toHaveBeenCalledWith('https://img.example.test/cover.png');
  });

  it('rejects missing artwork URLs before proxying', async () => {
    const response = await request(createApp()).get('/api/artwork');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(fetchRemoteArtworkMock).not.toHaveBeenCalled();
  });

  it('normalizes remote artwork fetch failures', async () => {
    fetchRemoteArtworkMock.mockRejectedValueOnce(
      new HttpError(400, 'Image URL could not be loaded.', {
        code: 'INVALID_INPUT',
      }),
    );

    const response = await request(createApp()).get('/api/artwork').query({
      url: 'https://img.example.test/missing.png',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
      error: 'Image URL could not be loaded.',
    });
  });
});
