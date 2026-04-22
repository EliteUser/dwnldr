import type { TrackOptions } from '../types.js';
import type { VideoInfo } from 'ytdlp-nodejs';

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

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
import { getExtension, renameFile } from './common.utils.js';
import { updateTrackMeta } from './metadata.utils.js';

type YoutubeDownloadOptions = {
  folder: string;
  track: TrackOptions;
};

const cropToCenterSquare = async (buffer: Buffer): Promise<Buffer> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  const side = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - side) / 2);
  const top = Math.floor((metadata.height - side) / 2);

  return image
    .extract({
      left,
      top,
      width: side,
      height: side,
    })
    .toBuffer();
};

const resizeImage = async (buffer: Buffer, size: number = 512): Promise<Buffer> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || metadata.width < size) {
    return buffer;
  }

  return image
    .resize(size, size, {
      fit: 'fill',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
};

const getYoutubeThumbnail = async (info: VideoInfo, folder: string): Promise<string> => {
  if (info._type !== 'video') {
    return '';
  }

  if (!info.thumbnail) {
    throw new Error('No thumbnail found for video');
  }

  const response = await fetch(info.thumbnail);

  if (!response.ok) {
    throw new Error('Failed to download thumbnail');
  }

  const originalBuffer = Buffer.from(await response.arrayBuffer());
  const squareBuffer = await cropToCenterSquare(originalBuffer);
  const finalImage = await resizeImage(squareBuffer);
  const outputPath = path.join(folder, 'cover.png');

  await sharp(finalImage).png().toFile(outputPath);

  return outputPath;
};

export const downloadYoutubeTrack = async (options: YoutubeDownloadOptions) => {
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
    )) as VideoInfo;
    const trackName = (name ?? info.title).trim();
    const trackPath = path.join(folder, `${trackName}.mp3`);

    const [, coverPath] = await Promise.all([
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
            trackPath,
          },
        },
        () =>
          ytdlp.execAsync(url, {
            jsRuntime: 'node',
            format: 'bestaudio/best',
            audioFormat: 'mp3',
            audioQuality: '0',
            extractAudio: true,
            embedMetadata: true,
            embedThumbnail: true,
            noPlaylist: true,
            output: trackPath,
          }),
      ),
      getYoutubeThumbnail(info, path.resolve(folder)),
    ]);

    if (coverPath) {
      const newCoverPath = path.join(folder, `${trackName}.${getExtension(coverPath)}`);
      await renameFile(coverPath, newCoverPath);
    }

    await updateTrackMeta({
      folder,
      name: trackName,
      album: album?.trim(),
      lyrics: lyrics?.trim(),
    });

    return trackPath;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw toYouTubeHttpError(error, YOUTUBE_UPSTREAM_MESSAGE);
  }
};
