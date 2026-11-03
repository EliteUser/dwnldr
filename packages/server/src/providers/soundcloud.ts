import { getLikes, getProfile, getTrack } from '../services/soundcloud.js';
import type { Provider } from './types.js';

export const soundcloud: Provider = {
  key: 'soundcloud',
  label: 'SoundCloud',
  hosts: ['soundcloud.com'],
  // The SoundCloud API answers much faster than yt-dlp and is the only source of profiles and likes.
  getTrack,
  getProfile,
  getLikes,
};
