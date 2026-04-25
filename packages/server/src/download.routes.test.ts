import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const downloadTrackMock = vi.fn();
const streamFileToResponseMock = vi.fn();

vi.mock('./services/download/download.service.js', () => ({
  downloadTrack: downloadTrackMock,
  streamFileToResponse: streamFileToResponseMock,
}));

const { createApp } = await import('./app.js');

describe('download route', () => {
  beforeEach(() => {
    downloadTrackMock.mockResolvedValue({
      downloadFolder: 'folder',
      fileName: 'track.mp3',
      filePath: 'folder/track.mp3',
      fileSize: 1,
    });
    streamFileToResponseMock.mockImplementation((res) => {
      res.status(204).end();
    });
  });

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

  it('passes multipart artwork to the download service', async () => {
    const response = await request(createApp())
      .post('/api/download')
      .field('url', 'https://www.youtube.com/watch?v=abc123')
      .field('name', 'Artist - Title')
      .field('artworkSource', 'custom')
      .attach('artwork', Buffer.from([1, 2, 3]), {
        filename: 'cover.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(204);
    expect(downloadTrackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://www.youtube.com/watch?v=abc123',
        name: 'Artist - Title',
        artwork: expect.objectContaining({
          buffer: Buffer.from([1, 2, 3]),
          mimeType: 'image/png',
          originalName: 'cover.png',
          size: 3,
        }),
      }),
    );
  });

  it('rejects custom artwork requests without a file', async () => {
    const response = await request(createApp()).post('/api/download').send({
      url: 'https://www.youtube.com/watch?v=abc123',
      artworkSource: 'custom',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(downloadTrackMock).not.toHaveBeenCalled();
  });

  it('rejects artwork files without the custom artwork source flag', async () => {
    const response = await request(createApp())
      .post('/api/download')
      .field('url', 'https://www.youtube.com/watch?v=abc123')
      .attach('artwork', Buffer.from([1, 2, 3]), {
        filename: 'cover.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(downloadTrackMock).not.toHaveBeenCalled();
  });

  it('rejects artwork files above the upload limit as invalid input', async () => {
    const response = await request(createApp())
      .post('/api/download')
      .field('url', 'https://www.youtube.com/watch?v=abc123')
      .field('artworkSource', 'custom')
      .attach('artwork', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'cover.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(downloadTrackMock).not.toHaveBeenCalled();
  });
});
