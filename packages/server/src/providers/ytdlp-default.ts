import type { Track } from '@dwnldr/shared';
import fs from 'node:fs/promises';
import path from 'node:path';

import { isAbortError } from '../errors/error-utils.js';
import { HttpError } from '../errors/http-error.js';
import { getLogger } from '../lib/logger.js';
import { runYtDlp, YtDlpError } from '../lib/ytdlp.js';
import type { DownloadedAudio } from './types.js';

const METADATA_TIMEOUT_MS = 60_000;

type YtDlpInfo = {
  _type?: string;
  channel?: string;
  duration?: number;
  id: number | string;
  thumbnail?: string;
  title: string;
  uploader?: string;
  webpage_url?: string;
};

const toHttpError = (error: unknown) => {
  if (error instanceof HttpError || isAbortError(error)) {
    return error;
  }

  if (error instanceof YtDlpError) {
    getLogger().warn({ evt: 'ytdlp.failed', exitCode: error.exitCode, stderr: error.stderrTail }, 'yt-dlp failed');
  } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    getLogger().error({ evt: 'ytdlp.spawn.failed', err: error }, 'yt-dlp could not be started');
    return new HttpError(500, 'The audio downloader could not be started.', { code: 'INTERNAL_ERROR' });
  }

  return new HttpError(502, 'The source did not respond. Try again later.', { code: 'UPSTREAM_FAILURE' });
};

export const getTrackWithYtDlp = async (url: string, signal: AbortSignal): Promise<Track> => {
  let info: YtDlpInfo;

  try {
    const output = await runYtDlp(
      ['--dump-single-json', '--flat-playlist', '--no-playlist'],
      url,
      AbortSignal.any([signal, AbortSignal.timeout(METADATA_TIMEOUT_MS)]),
    );
    info = JSON.parse(output) as YtDlpInfo;
  } catch (error) {
    throw toHttpError(error);
  }

  if (info._type === 'playlist') {
    throw new HttpError(400, 'Playlists are not supported.', { code: 'PLAYLIST_NOT_SUPPORTED' });
  }

  return {
    id: String(info.id),
    url: info.webpage_url ?? url,
    title: info.title,
    artist: info.channel ?? info.uploader ?? '',
    durationMs: Math.round((info.duration ?? 0) * 1000),
    artworkUrl: info.thumbnail ?? null,
  };
};

const fileExists = (filePath: string) =>
  fs.access(filePath).then(
    () => true,
    () => false,
  );

export const downloadWithYtDlp = async (url: string, folder: string, signal: AbortSignal): Promise<DownloadedAudio> => {
  try {
    await runYtDlp(
      [
        '--format',
        'bestaudio/best',
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '0',
        '--write-thumbnail',
        '--convert-thumbnails',
        'jpg',
        '--no-playlist',
        // A bare playlist link would otherwise download every entry.
        '--playlist-items',
        '1',
        '--output',
        path.join(folder, 'source.%(ext)s'),
        '--output',
        `thumbnail:${path.join(folder, 'thumbnail.%(ext)s')}`,
      ],
      url,
      signal,
    );
  } catch (error) {
    throw toHttpError(error);
  }

  const audioPath = path.join(folder, 'source.mp3');
  const artworkPath = path.join(folder, 'thumbnail.jpg');

  if (!(await fileExists(audioPath))) {
    throw new HttpError(502, 'The source did not return audio.', { code: 'UPSTREAM_FAILURE' });
  }

  return {
    audioPath,
    artworkPath: (await fileExists(artworkPath)) ? artworkPath : undefined,
  };
};
