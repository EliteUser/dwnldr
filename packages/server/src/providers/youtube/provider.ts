import type { MusicProvider } from '../types.js';

import { downloadYoutubeTrack } from '../../services/youtube/youtube-download.service.js';
import { getYouTubeTrackByUrl } from '../../services/youtube/youtube.service.js';

export const youtubeProvider: MusicProvider = {
  key: 'youtube',
  label: 'YouTube',
  capabilities: {
    collections: false,
    downloads: true,
    metadata: true,
    users: false,
  },
  downloadTrack: downloadYoutubeTrack,
  matchesUrl: (url) =>
    url.hostname === 'youtu.be' || url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com'),
  resolveTrack: getYouTubeTrackByUrl,
};
