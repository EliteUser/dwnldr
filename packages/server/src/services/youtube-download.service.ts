import type { ProviderDownloadOptions } from '../providers/types.js';
import type { PlaylistInfo, VideoInfo } from 'ytdlp-nodejs';

import fs from 'node:fs/promises';
import path from 'node:path';

import { getErrorMessage } from '../errors/error-utils.js';
import { HttpError } from '../errors/http-error.js';
import {
  isYtDlpSignatureError,
  isYtDlpSpawnError,
  toYouTubeHttpError,
  YOUTUBE_UPSTREAM_MESSAGE,
} from '../errors/youtube-errors.js';
import { logTimedOperation } from '../lib/logger.js';
import { createYtDlp } from '../lib/ytdlp.js';
import { sanitizeFilename } from '../utils/sanitize.utils.js';
import { postProcessTrack } from './post-process.service.js';
import { saveThumbnailFromUrl } from './thumbnail.service.js';

const getYoutubeThumbnail = async (info: VideoInfo, folder: string): Promise<string | undefined> => {
  if (info._type !== 'video') {
    return undefined;
  }

  if (!info.thumbnail) {
    throw new Error('No thumbnail found for video');
  }

  return saveThumbnailFromUrl(info.thumbnail, path.join(folder, 'cover.png'));
};

export const downloadYoutubeTrack = async (options: ProviderDownloadOptions) => {
  const { folder, track } = options;
  const { url, name, album, lyrics } = track;
  const ytdlp = createYtDlp();

  try {
    await fs.mkdir(folder, { recursive: true });

    const info = (await logTimedOperation(
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
    )) as PlaylistInfo | VideoInfo;

    if (info._type === 'playlist') {
      throw new HttpError(400, 'Playlists are not supported', {
        code: 'YOUTUBE_PLAYLIST',
      });
    }

    const trackName = (name ?? info.title).trim();
    const sanitizedTrackName = sanitizeFilename(trackName);
    const downloadTargetPath = path.join(folder, `${sanitizedTrackName}.source.mp3`);

    const [trackPath, coverPath] = await Promise.all([
      logTimedOperation(
        {
          startEvt: 'download.conversion.started',
          successEvt: 'download.conversion.completed',
          failureEvt: (error) => {
            if (isYtDlpSignatureError(error)) {
              return 'ytdlp.signature.error';
            }

            if (isYtDlpSpawnError(error)) {
              return 'ytdlp.spawn.failed';
            }

            return 'download.conversion.failed';
          },
          startMessage: 'Starting YouTube download conversion',
          successMessage: 'Completed YouTube download conversion',
          failureMessage: (error) =>
            isYtDlpSignatureError(error)
              ? 'yt-dlp failed to extract the current YouTube signature'
              : `Failed to download or convert YouTube audio: ${getErrorMessage(error)}`,
          bindings: {
            provider: 'youtube',
            url,
            trackPath: downloadTargetPath,
          },
        },
        async () => {
          await ytdlp.execAsync(url, {
            jsRuntime: 'node',
            format: 'bestaudio/best',
            audioFormat: 'mp3',
            audioQuality: '0',
            extractAudio: true,
            embedMetadata: true,
            embedThumbnail: true,
            noPlaylist: true,
            output: downloadTargetPath,
          });

          return downloadTargetPath;
        },
      ),
      getYoutubeThumbnail(info, path.resolve(folder)),
    ]);

    const processedTrack = await postProcessTrack({
      album: album?.trim(),
      coverPath,
      folder,
      lyrics: lyrics?.trim(),
      name: trackName,
      trackPath,
    });

    return processedTrack.filePath;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw toYouTubeHttpError(error, YOUTUBE_UPSTREAM_MESSAGE);
  }
};
