import type { ProviderAdapter } from '../types';

import { createDefaultTrackName } from '../common';

export const soundcloudProvider: ProviderAdapter = {
  key: 'soundcloud',
  label: 'SoundCloud',
  trackPath: 'soundcloud/tracks',
  capabilities: {
    collections: true,
    downloads: true,
    metadata: true,
    users: true,
  },
  getTrackQueryKey: (url: string) => ['providers', 'soundcloud', 'track', url],
  matchesUrl: (url: URL) => url.hostname === 'soundcloud.com' || url.hostname.endsWith('.soundcloud.com'),
  toDownloadName: createDefaultTrackName,
};
