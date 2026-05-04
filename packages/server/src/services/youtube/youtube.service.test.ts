import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkInstallationAsyncMock = vi.fn();
const getInfoAsyncMock = vi.fn();

vi.mock('../../lib/ytdlp.js', () => ({
  createYtDlp: () => ({
    checkInstallationAsync: checkInstallationAsyncMock,
    getInfoAsync: getInfoAsyncMock,
  }),
}));

const { getYouTubeTrackByUrl } = await import('./youtube.service.js');

describe('getYouTubeTrackByUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getInfoAsyncMock.mockResolvedValue({
      _type: 'video',
      id: 'video-1',
      channel: 'Channel',
      title: 'Track Title',
      thumbnail: 'https://img.youtube.com/vi/video-1/default.jpg',
      original_url: 'https://www.youtube.com/watch?v=video-1',
      duration: 210,
    });
  });

  it('fetches metadata without rechecking yt-dlp installation', async () => {
    const metadata = await getYouTubeTrackByUrl('https://www.youtube.com/watch?v=video-1');

    expect(checkInstallationAsyncMock).not.toHaveBeenCalled();
    expect(getInfoAsyncMock).toHaveBeenCalledWith('https://www.youtube.com/watch?v=video-1');
    expect(metadata.duration).toBe(210000);
  });

  it('returns a typed playlist error', async () => {
    getInfoAsyncMock.mockResolvedValue({
      _type: 'playlist',
    });

    await expect(getYouTubeTrackByUrl('https://www.youtube.com/watch?v=playlist')).rejects.toMatchObject({
      code: 'YOUTUBE_PLAYLIST',
      statusCode: 400,
    });
  });
});
