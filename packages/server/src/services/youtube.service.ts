import type { VideoInfo } from 'ytdlp-nodejs';

import { HttpError } from '../errors/http-error.js';
import {
  getErrorMessage,
  isYtDlpSignatureError,
  isYtDlpSpawnError,
  toYouTubeHttpError,
  YOUTUBE_UPSTREAM_MESSAGE,
} from '../errors/upstream-error.js';
import { logTimedOperation } from '../lib/logger.js';
import { createYtDlp } from '../lib/ytdlp.js';
import { getYouTubeTrackData } from './track-metadata.service.js';

export const getYouTubeTrackByUrl = async (url: string) => {
  const ytdlp = createYtDlp();
  const info = await logTimedOperation(
    {
      startEvt: 'ytdlp.info.started',
      successEvt: 'ytdlp.info.completed',
      failureEvt: (error) => {
        if (isYtDlpSignatureError(error)) {
          return 'ytdlp.signature.error';
        }

        if (isYtDlpSpawnError(error)) {
          return 'ytdlp.spawn.failed';
        }

        return 'ytdlp.info.failed';
      },
      startMessage: 'Fetching YouTube metadata',
      successMessage: 'Fetched YouTube metadata',
      failureMessage: (error) =>
        isYtDlpSignatureError(error)
          ? 'yt-dlp failed to extract the current YouTube signature'
          : `Failed to fetch YouTube metadata: ${getErrorMessage(error)}`,
      bindings: {
        provider: 'youtube',
        url,
      },
    },
    () => ytdlp.getInfoAsync(url),
  ).catch((error: unknown) => {
    throw toYouTubeHttpError(error, YOUTUBE_UPSTREAM_MESSAGE);
  });

  if (info._type === 'playlist') {
    throw new HttpError(400, 'Playlists are not supported', {
      code: 'YOUTUBE_PLAYLIST',
    });
  }

  return getYouTubeTrackData(info as VideoInfo);
};
