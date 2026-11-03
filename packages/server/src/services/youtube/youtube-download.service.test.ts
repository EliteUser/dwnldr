import type * as FsPromises from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdirMock = vi.fn();
const runYtDlpMock = vi.fn();

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof FsPromises>('node:fs/promises');

  return {
    ...actual,
    default: {
      ...actual.default,
      mkdir: mkdirMock,
    },
    mkdir: mkdirMock,
  };
});

vi.mock('../../lib/ytdlp.js', () => ({
  runYtDlp: runYtDlpMock,
}));

const { downloadYoutubeTrack } = await import('./youtube-download.service.js');

describe('downloadYoutubeTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
  });

  it('rejects playlists before starting the download subprocess', async () => {
    runYtDlpMock.mockResolvedValue(JSON.stringify({ _type: 'playlist', title: 'Playlist Title' }));

    await expect(
      downloadYoutubeTrack({
        folder: '/tmp/downloads/track',
        signal: new AbortController().signal,
        track: {
          url: 'https://www.youtube.com/watch?v=playlist',
        },
      }),
    ).rejects.toMatchObject({
      code: 'YOUTUBE_PLAYLIST',
      statusCode: 400,
    });

    expect(runYtDlpMock).toHaveBeenCalledTimes(1);
  });
});
