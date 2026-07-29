import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { postProcessTrackMock, saveThumbnailFromUrlMock } = vi.hoisted(() => ({
  postProcessTrackMock: vi.fn(),
  saveThumbnailFromUrlMock: vi.fn(),
}));

vi.mock('../media/post-process.service.js', () => ({
  postProcessTrack: postProcessTrackMock,
}));

vi.mock('../media/thumbnail.service.js', () => ({
  saveThumbnailFromUrl: saveThumbnailFromUrlMock,
}));

import { downloadSoundCloudTrack } from './soundcloud-download.service.js';

describe('downloadSoundCloudTrack', () => {
  afterEach(() => {
    postProcessTrackMock.mockReset();
    saveThumbnailFromUrlMock.mockReset();
  });

  it('propagates upstream download failures instead of returning an empty path', async () => {
    const error = new Error('SoundCloud failed');
    const api = {
      util: {
        downloadTrack: vi.fn().mockRejectedValue(error),
      },
      tracks: {
        get: vi.fn(),
      },
    };

    await expect(
      downloadSoundCloudTrack({
        api: api as never,
        folder: 'tmp',
        track: {
          url: 'https://soundcloud.com/artist/track',
        },
      }),
    ).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 502,
    });
  });

  it('downloads provider artwork through the hardened thumbnail service', async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-soundcloud-'));
    const api = {
      util: {
        downloadTrack: vi.fn().mockResolvedValue(path.join(folder, 'track.mp3')),
      },
      tracks: {
        get: vi.fn().mockResolvedValue({
          artwork_url: 'https://i1.sndcdn.com/artworks-example-large.jpg',
          title: 'Track',
          user: {
            avatar_url: 'https://i1.sndcdn.com/avatars-example-large.jpg',
            username: 'Artist',
          },
        }),
      },
    };
    saveThumbnailFromUrlMock.mockResolvedValue(path.join(folder, 'cover.png'));
    postProcessTrackMock.mockResolvedValue({
      filePath: path.join(folder, 'final.mp3'),
    });

    try {
      await downloadSoundCloudTrack({
        api: api as never,
        folder,
        track: {
          url: 'https://soundcloud.com/artist/track',
        },
      });

      expect(saveThumbnailFromUrlMock).toHaveBeenCalledWith(
        'https://i1.sndcdn.com/artworks-example-t500x500.jpg',
        path.join(folder, 'cover.png'),
        undefined,
      );
    } finally {
      await fs.rm(folder, { force: true, recursive: true });
    }
  });
});
