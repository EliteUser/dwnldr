import type { VideoInfo } from 'ytdlp-nodejs';

import { HttpError } from '../errors/http-error.js';
import { createYtDlp } from '../lib/ytdlp.js';
import { getYouTubeTrackData } from './track-metadata.service.js';

export const getYouTubeTrackByUrl = async (url: string) => {
  const ytdlp = createYtDlp();
  const info = await ytdlp.getInfoAsync(url);

  if (info._type === 'playlist') {
    throw new HttpError(400, 'Playlists are not supported');
  }

  return getYouTubeTrackData(info as VideoInfo);
};
