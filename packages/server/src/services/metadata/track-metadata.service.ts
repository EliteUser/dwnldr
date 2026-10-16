import type { VideoInfo } from 'ytdlp-nodejs';

import type { TrackMetadata } from '../../types.js';
import type { SoundCloudTrack } from '../soundcloud/soundcloud.schemas.js';

export const getSoundCloudTrackData = (track: SoundCloudTrack): TrackMetadata => {
  const artworkUrl = track.artwork_url ?? null;

  return {
    id: track.id,
    user: track.user.username,
    title: track.title,
    artwork: {
      url: artworkUrl,
    },
    artwork_url: artworkUrl,
    permalink_url: track.permalink_url,
    duration: track.duration,
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
