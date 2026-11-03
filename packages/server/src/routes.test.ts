import NodeID3 from 'node-id3';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as YtDlpModule from './lib/ytdlp.js';

const { runYtDlpMock, soundCloudMock } = vi.hoisted(() => ({
  runYtDlpMock: vi.fn(),
  soundCloudMock: { getLikes: vi.fn(), getProfile: vi.fn(), getTrack: vi.fn() },
}));

vi.mock('./lib/ytdlp.js', async (importOriginal) => ({
  ...(await importOriginal<typeof YtDlpModule>()),
  runYtDlp: runYtDlpMock,
}));
vi.mock('./services/soundcloud.js', () => soundCloudMock);

const { env } = await import('./config/env.js');
const { createApp } = await import('./app.js');

const app = createApp();
const youtubeUrl = 'https://www.youtube.com/watch?v=abc123';

const createJpeg = (width = 400, height = 300) =>
  sharp({ create: { width, height, channels: 3, background: '#3366ff' } })
    .jpeg()
    .toBuffer();

const listDownloadFolders = async () =>
  (await fs.readdir(env.TEMP_DIR).catch(() => [])).filter((name) => name.startsWith('track_'));

/** Pretends to be yt-dlp: writes the audio and thumbnail files named by the --output templates. */
const fakeYtDlpDownload = async (args: string[]) => {
  const [audioTemplate, thumbnailTemplate] = args.flatMap((arg, index) =>
    args[index - 1] === '--output' ? [arg] : [],
  );

  await fs.writeFile(audioTemplate.replace('%(ext)s', 'mp3'), Buffer.alloc(512));
  await fs.writeFile(thumbnailTemplate.replace('thumbnail:', '').replace('%(ext)s', 'jpg'), await createJpeg());

  return '';
};

beforeEach(() => {
  runYtDlpMock.mockImplementation(fakeYtDlpDownload);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/providers', () => {
  it('lists the supported providers', async () => {
    const response = await request(app).get('/api/providers');

    expect(response.body).toEqual([
      { key: 'soundcloud', label: 'SoundCloud' },
      { key: 'youtube', label: 'YouTube' },
    ]);
  });
});

describe('GET /api/tracks', () => {
  it('resolves YouTube metadata through yt-dlp', async () => {
    runYtDlpMock.mockResolvedValue(
      JSON.stringify({
        channel: 'Channel',
        duration: 210.5,
        id: 'abc123',
        thumbnail: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
        title: 'Title',
        webpage_url: youtubeUrl,
      }),
    );

    const response = await request(app).get('/api/tracks').query({ url: youtubeUrl });

    expect(response.body).toEqual({
      id: 'abc123',
      url: youtubeUrl,
      title: 'Title',
      artist: 'Channel',
      durationMs: 210500,
      artworkUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
    });
    expect(runYtDlpMock).toHaveBeenCalledWith(
      expect.arrayContaining(['--no-playlist']),
      youtubeUrl,
      expect.any(AbortSignal),
    );
  });

  it('uses the provider override for SoundCloud', async () => {
    soundCloudMock.getTrack.mockResolvedValue({ id: '1', title: 'Track' });

    const response = await request(app).get('/api/tracks').query({ url: 'https://soundcloud.com/artist/track' });

    expect(response.body).toEqual({ id: '1', title: 'Track' });
    expect(runYtDlpMock).not.toHaveBeenCalled();
  });

  it('rejects playlists', async () => {
    runYtDlpMock.mockResolvedValue(JSON.stringify({ _type: 'playlist', id: 'list', title: 'List' }));

    const response = await request(app).get('/api/tracks').query({ url: 'https://www.youtube.com/playlist?list=1' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PLAYLIST_NOT_SUPPORTED');
  });

  it('rejects unsupported sources without starting yt-dlp', async () => {
    const response = await request(app).get('/api/tracks').query({ url: 'https://example.com/track' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNSUPPORTED_SOURCE');
    expect(runYtDlpMock).not.toHaveBeenCalled();
  });

  it('maps yt-dlp failures to an upstream error', async () => {
    const { YtDlpError } = await import('./lib/ytdlp.js');
    runYtDlpMock.mockRejectedValue(new YtDlpError(1, 'ERROR: Video unavailable'));

    const response = await request(app).get('/api/tracks').query({ url: youtubeUrl });

    expect(response.status).toBe(502);
    expect(response.body.code).toBe('UPSTREAM_FAILURE');
  });
});

describe('GET /api/profile and /api/likes', () => {
  it('dispatch to the provider by URL', async () => {
    soundCloudMock.getProfile.mockResolvedValue({ id: '7', name: 'Artist' });
    soundCloudMock.getLikes.mockResolvedValue([{ id: '1' }]);
    const url = 'https://soundcloud.com/artist';

    const [profile, likes] = await Promise.all([
      request(app).get('/api/profile').query({ url }),
      request(app).get('/api/likes').query({ url }),
    ]);

    expect(profile.body).toEqual({ id: '7', name: 'Artist' });
    expect(likes.body).toEqual([{ id: '1' }]);
    expect(soundCloudMock.getLikes).toHaveBeenCalledWith(url, expect.any(AbortSignal));
  });

  it('reject providers without likes', async () => {
    const response = await request(app).get('/api/likes').query({ url: 'https://www.youtube.com/@channel' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNSUPPORTED_SOURCE');
  });
});

describe('POST /api/download', () => {
  it('downloads, tags and returns the MP3, then removes the temp folder', async () => {
    const foldersBefore = await listDownloadFolders();

    const response = await request(app)
      .post('/api/download')
      .send({ url: youtubeUrl, name: 'Artist - Song', album: 'Album' })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('filename="Artist - Song.mp3"');

    const tags = NodeID3.read(response.body as Buffer);
    expect(tags).toMatchObject({ artist: 'Artist', title: 'Song', album: 'Album' });
    expect(tags.image).toBeTruthy();
    // The folder is removed right after the response finishes streaming.
    await vi.waitFor(async () => expect(await listDownloadFolders()).toEqual(foldersBefore));
  });

  it('prefers uploaded artwork and validates it', async () => {
    const response = await request(app)
      .post('/api/download')
      .field('url', youtubeUrl)
      .field('name', 'Artist - Song')
      .attach('artwork', Buffer.from('not an image'), { filename: 'cover.png', contentType: 'image/png' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Artwork image could not be decoded.');
    expect(runYtDlpMock).not.toHaveBeenCalled();
  });

  it('rejects malformed and unsupported requests', async () => {
    const [malformed, unsupported] = await Promise.all([
      request(app).post('/api/download').send({ url: 'not-a-url', name: 'x' }),
      request(app).post('/api/download').send({ url: 'https://example.com/audio', name: 'x' }),
    ]);

    expect(malformed.body.code).toBe('INVALID_INPUT');
    expect(unsupported.body.code).toBe('UNSUPPORTED_SOURCE');
  });
});

describe('meta routes', () => {
  it('reads tags from an uploaded MP3', async () => {
    const audio = NodeID3.update({ artist: 'Artist', title: 'Title', album: 'Album' }, Buffer.alloc(256));

    const response = await request(app)
      .post('/api/meta/inspect')
      .attach('audio', audio, { filename: 'track.mp3', contentType: 'audio/mpeg' });

    expect(response.body).toEqual({ album: 'Album', artwork: null, lyrics: '', name: 'Artist - Title' });
  });

  it('rewrites tags and returns the renamed MP3', async () => {
    const response = await request(app)
      .post('/api/meta/download')
      .field('name', 'New Artist - New Title')
      .attach('audio', Buffer.alloc(256), { filename: 'track.mp3', contentType: 'audio/mpeg' })
      .attach('artwork', await createJpeg(200, 200), { filename: 'cover.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('New Artist - New Title.mp3');
  });

  it('rejects non-MP3 uploads', async () => {
    const response = await request(app)
      .post('/api/meta/inspect')
      .attach('audio', Buffer.alloc(16), { filename: 'track.wav', contentType: 'audio/wav' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Audio file must be an MP3.');
  });
});
