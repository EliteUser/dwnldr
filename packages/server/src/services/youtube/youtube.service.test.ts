import { beforeEach, describe, expect, it, vi } from 'vitest';

const runYtDlpMock = vi.fn();

vi.mock('../../lib/ytdlp.js', () => ({
  runYtDlp: runYtDlpMock,
}));

const { getYouTubeTrackByUrl } = await import('./youtube.service.js');

describe('getYouTubeTrackByUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    runYtDlpMock.mockResolvedValue(
      JSON.stringify({
        _type: 'video',
        id: 'video-1',
        channel: 'Channel',
        title: 'Track Title',
        thumbnail: 'https://img.youtube.com/vi/video-1/default.jpg',
        original_url: 'https://www.youtube.com/watch?v=video-1',
        duration: 210,
      }),
    );
  });

  it('fetches single-video metadata with one yt-dlp call', async () => {
    const metadata = await getYouTubeTrackByUrl(
      'https://www.youtube.com/watch?v=video-1',
      new AbortController().signal,
    );

    expect(runYtDlpMock).toHaveBeenCalledWith(
      ['--dump-single-json', '--flat-playlist', '--no-playlist'],
      'https://www.youtube.com/watch?v=video-1',
      expect.any(AbortSignal),
    );
    expect(metadata.duration).toBe(210000);
  });

  it('returns a typed playlist error', async () => {
    runYtDlpMock.mockResolvedValue(JSON.stringify({ _type: 'playlist' }));

    await expect(
      getYouTubeTrackByUrl('https://www.youtube.com/playlist?list=1', new AbortController().signal),
    ).rejects.toMatchObject({
      code: 'YOUTUBE_PLAYLIST',
      statusCode: 400,
    });
  });
});
