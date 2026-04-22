import type { VideoInfo } from 'ytdlp-nodejs';

import { describe, expect, it } from 'vitest';

import { getYouTubeTrackData } from './track-metadata.service.js';

describe('getYouTubeTrackData', () => {
  it('normalizes yt-dlp duration values to milliseconds', () => {
    const metadata = getYouTubeTrackData({
      _type: 'video',
      id: 'video-1',
      channel: 'Channel',
      title: 'Track Title',
      thumbnail: 'https://img.youtube.com/vi/video-1/default.jpg',
      original_url: 'https://www.youtube.com/watch?v=video-1',
      duration: 210,
    } as VideoInfo);

    expect(metadata.duration).toBe(210000);
  });
});
