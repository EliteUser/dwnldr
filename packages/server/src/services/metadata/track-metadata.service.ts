import type { TrackMetadata } from '../../types.js';
import type { SoundcloudTrack } from 'soundcloud.ts';
import type { VideoInfo } from 'ytdlp-nodejs';

export const getSoundCloudTrackData = (track: SoundcloudTrack): TrackMetadata => {
  const { id, user, title, artwork_url, permalink_url, duration } = track;

  return {
    id,
    user: user.username,
    title,
    artwork: {
      url: artwork_url,
    },
    artwork_url,
    permalink_url,
    duration,
  };
};

export const getYouTubeTrackData = (info: VideoInfo): TrackMetadata => {
  const { id, channel, title, thumbnail, original_url, duration } = info;

  return {
    id,
    user: channel,
    title,
    artwork: {
      url: thumbnail ?? null,
    },
    artwork_url: thumbnail ?? null,
    permalink_url: original_url,
    duration: (duration ?? 0) * 1000,
  };
};
