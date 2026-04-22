import { describe, expect, it, vi } from 'vitest';

import { downloadSoundCloudTrack } from './download.utils.js';

describe('downloadSoundCloudTrack', () => {
  it('propagates upstream download failures instead of returning an empty path', async () => {
    const error = new Error('SoundCloud failed');
    const api = {
      util: {
        downloadTrack: vi.fn().mockRejectedValue(error),
        downloadSongCover: vi.fn().mockResolvedValue('cover.jpg'),
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
    ).rejects.toThrow(error);
  });
});
