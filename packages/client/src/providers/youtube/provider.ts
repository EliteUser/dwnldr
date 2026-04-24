import type { ProviderAdapter } from '../types';

import { createDefaultTrackName } from '../common';

export const youtubeProvider: ProviderAdapter = {
  key: 'youtube',
  label: 'YouTube',
  trackPath: 'youtube/tracks',
  capabilities: {
    collections: false,
    downloads: true,
    metadata: true,
    users: false,
  },
  getTrackQueryKey: (url: string) => ['providers', 'youtube', 'track', url],
  matchesUrl: (url: URL) =>
    url.hostname === 'youtu.be' || url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com'),
  toDownloadName: createDefaultTrackName,
};
