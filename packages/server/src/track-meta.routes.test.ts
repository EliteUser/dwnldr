import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const inspectLocalTrackMock = vi.fn();
const rewriteLocalTrackMock = vi.fn();
const streamFileToResponseMock = vi.fn();

vi.mock('./services/track-meta/track-meta.service.js', () => ({
  inspectLocalTrack: inspectLocalTrackMock,
  rewriteLocalTrack: rewriteLocalTrackMock,
}));

vi.mock('./services/download/download.service.js', () => ({
  streamFileToResponse: streamFileToResponseMock,
}));

const { createApp } = await import('./app.js');

describe('track meta routes', () => {
  beforeEach(() => {
    inspectLocalTrackMock.mockResolvedValue({
      album: 'Album',
      artwork: null,
      lyrics: '',
      name: 'Artist - Track',
    });
    rewriteLocalTrackMock.mockResolvedValue({
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

  it('inspects an uploaded MP3 file', async () => {
    const response = await request(createApp())
      .post('/api/meta/inspect')
      .attach('audio', Buffer.from([1, 2, 3]), {
        filename: 'track.mp3',
        contentType: 'audio/mpeg',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      album: 'Album',
      name: 'Artist - Track',
    });
    expect(inspectLocalTrackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: Buffer.from([1, 2, 3]),
        mimeType: 'audio/mpeg',
        originalName: 'track.mp3',
        size: 3,
      }),
    );
  });

  it('rewrites an uploaded MP3 with custom artwork', async () => {
    const response = await request(createApp())
      .post('/api/meta/download')
      .field('name', 'Artist - Track')
      .field('artworkSource', 'custom')
      .attach('audio', Buffer.from([1, 2, 3]), {
        filename: 'track.mp3',
        contentType: 'audio/mpeg',
      })
      .attach('artwork', Buffer.from([4, 5, 6]), {
        filename: 'cover.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(204);
    expect(rewriteLocalTrackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        artwork: expect.objectContaining({
          buffer: Buffer.from([4, 5, 6]),
          mimeType: 'image/png',
          originalName: 'cover.png',
          size: 3,
        }),
        audio: expect.objectContaining({
          buffer: Buffer.from([1, 2, 3]),
          mimeType: 'audio/mpeg',
          originalName: 'track.mp3',
          size: 3,
        }),
        name: 'Artist - Track',
      }),
    );
  });

  it('rejects rewrite requests without an audio file', async () => {
    const response = await request(createApp()).post('/api/meta/download').field('name', 'Artist - Track');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(rewriteLocalTrackMock).not.toHaveBeenCalled();
  });

  it('rejects custom artwork requests without artwork', async () => {
    const response = await request(createApp())
      .post('/api/meta/download')
      .field('name', 'Artist - Track')
      .field('artworkSource', 'custom')
      .attach('audio', Buffer.from([1, 2, 3]), {
        filename: 'track.mp3',
        contentType: 'audio/mpeg',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(rewriteLocalTrackMock).not.toHaveBeenCalled();
  });

  it('rejects artwork above the artwork upload limit before rewriting the track', async () => {
    const response = await request(createApp())
      .post('/api/meta/download')
      .field('name', 'Artist - Track')
      .field('artworkSource', 'custom')
      .attach('audio', Buffer.from([1, 2, 3]), {
        filename: 'track.mp3',
        contentType: 'audio/mpeg',
      })
      .attach('artwork', Buffer.alloc(8 * 1024 * 1024 + 1), {
        filename: 'cover.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(rewriteLocalTrackMock).not.toHaveBeenCalled();
  });
});
