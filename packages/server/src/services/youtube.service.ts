import type { VideoInfo } from 'ytdlp-nodejs';

import { HttpError } from '../errors/http-error.js';
import { createYtDlp } from '../lib/ytdlp.js';
import { getYouTubeTrackData } from './track-metadata.service.js';

const ensureYtDlpAvailable = async () => {
  const ytdlp = createYtDlp();
  const installed = await ytdlp.checkInstallationAsync({ ffmpeg: true });

  if (!installed) {
    throw new HttpError(500, 'yt-dlp or ffmpeg is not available. Ensure the runtime includes both binaries.');
  }

  return ytdlp;
};

export const getYouTubeTrackByUrl = async (url: string) => {
  const ytdlp = await ensureYtDlpAvailable();
  const info = await ytdlp.getInfoAsync(url);

  if (info._type === 'playlist') {
    throw new HttpError(400, 'Playlists are not supported');
  }

  return getYouTubeTrackData(info as VideoInfo);
};
