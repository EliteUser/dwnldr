import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const downloadTrackMock = vi.fn();
const streamFileToResponseMock = vi.fn();

vi.mock('./services/download.service.js', () => ({
  downloadTrack: downloadTrackMock,
  streamFileToResponse: streamFileToResponseMock,
}));

const { createApp } = await import('./app.js');

describe('download route', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unsupported sources before invoking the download service', async () => {
    const response = await request(createApp()).post('/api/download').send({
      url: 'https://example.com/audio',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'UNSUPPORTED_SOURCE',
    });
    expect(downloadTrackMock).not.toHaveBeenCalled();
    expect(streamFileToResponseMock).not.toHaveBeenCalled();
  });
});
