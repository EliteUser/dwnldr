import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdirMock = vi.fn();
const getInfoAsyncMock = vi.fn();
const execAsyncMock = vi.fn();

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');

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
  createYtDlp: () => ({
    execAsync: execAsyncMock,
    getInfoAsync: getInfoAsyncMock,
  }),
}));

const { downloadYoutubeTrack } = await import('./youtube-download.service.js');

describe('downloadYoutubeTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
  });

  it('rejects playlists before starting the download subprocess', async () => {
    getInfoAsyncMock.mockResolvedValue({
      _type: 'playlist',
      title: 'Playlist Title',
    });

    await expect(
      downloadYoutubeTrack({
        folder: '/tmp/downloads/track',
        track: {
          url: 'https://www.youtube.com/watch?v=playlist',
        },
      }),
    ).rejects.toMatchObject({
      code: 'YOUTUBE_PLAYLIST',
      statusCode: 400,
    });

    expect(execAsyncMock).not.toHaveBeenCalled();
  });
});
