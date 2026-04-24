import type { MusicProvider } from '../types.js';

import { soundcloud } from '../../lib/soundcloud.js';
import { downloadSoundCloudTrack } from '../../services/soundcloud-download.service.js';
import { getFavoritesByUserId, getSoundCloudTrackByUrl, getUserById } from '../../services/soundcloud.service.js';

export const soundcloudProvider: MusicProvider = {
  key: 'soundcloud',
  label: 'SoundCloud',
  capabilities: {
    collections: true,
    downloads: true,
    metadata: true,
    users: true,
  },
  downloadTrack: ({ folder, track }) =>
    downloadSoundCloudTrack({
      api: soundcloud,
      folder,
      track,
    }),
  fetchFavorites: getFavoritesByUserId,
  getUser: getUserById,
  matchesUrl: (url) => url.hostname === 'soundcloud.com' || url.hostname.endsWith('.soundcloud.com'),
  resolveTrack: getSoundCloudTrackByUrl,
};
