import { downloadSoundCloudTrack } from '../../services/soundcloud/soundcloud-download.service.js';
import {
  getFavoritesByProfileUrl,
  getSoundCloudTrackByUrl,
  getUserByProfileUrl,
} from '../../services/soundcloud/soundcloud.service.js';
import type { MusicProvider } from '../types.js';

export const soundcloudProvider: MusicProvider = {
  key: 'soundcloud',
  label: 'SoundCloud',
  capabilities: {
    collections: true,
    downloads: true,
    metadata: true,
    users: true,
  },
  downloadTrack: downloadSoundCloudTrack,
  fetchFavorites: getFavoritesByProfileUrl,
  getUser: getUserByProfileUrl,
  matchesUrl: (url) => url.hostname === 'soundcloud.com' || url.hostname.endsWith('.soundcloud.com'),
  resolveTrack: getSoundCloudTrackByUrl,
};
