import fs from 'node:fs/promises';
import path from 'node:path';
import type { Exec, YtDlp } from 'ytdlp-nodejs';

import { env } from '../../config/env.js';
import { getErrorMessage, isAbortError } from '../../errors/error-utils.js';
import { HttpError } from '../../errors/http-error.js';
import { logTimedOperation } from '../../lib/logger.js';
import { createYtDlp } from '../../lib/ytdlp.js';
import type { ProviderDownloadOptions } from '../../providers/types.js';
import { getSafeUrlLogFields } from '../../utils/url-log.utils.js';
import { resolveArtworkPath } from '../artwork/artwork.service.js';
import { postProcessTrack } from '../media/post-process.service.js';
import { saveThumbnailFromUrl } from '../media/thumbnail.service.js';
import { normalizeSoundCloudTrackUrl } from './soundcloud.profile.js';
import { getSoundCloudTrackDetails } from './soundcloud.service.js';

const YTDLP_UPSTREAM_MESSAGE = 'SoundCloud audio could not be downloaded. Try again later.';
const YTDLP_SPAWN_MESSAGE = 'The audio downloader could not be started.';
const FORCE_KILL_DELAY_MS = 1_000;

type YtDlpExecution = Pick<YtDlp, 'exec'>;

const runSignalAwareYtDlp = async (
  ytdlp: YtDlpExecution,
  url: string,
  outputTemplate: string,
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  const command = ytdlp.exec(url, {
    abortOnError: true,
    cacheDir: env.YT_DLP_CACHE_DIR,
    format: 'bestaudio/best',
    jsRuntime: 'node',
    noPlaylist: true,
    output: outputTemplate,
  }) as Exec;
  let settled = false;
  let forceKillTimeout: ReturnType<typeof setTimeout> | undefined;
  const onAbort = () => {
    command.kill('SIGTERM');
    forceKillTimeout = setTimeout(() => {
      if (!settled) {
        command.kill('SIGKILL');
      }
    }, FORCE_KILL_DELAY_MS);
    forceKillTimeout.unref();
  };

  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    signal?.throwIfAborted();
    const result = await command.exec();
    signal?.throwIfAborted();
    return result;
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason ?? error;
    }

    throw error;
  } finally {
    settled = true;
    clearTimeout(forceKillTimeout);
    signal?.removeEventListener('abort', onAbort);
  }
};

const getActualAudioPath = async (folder: string, filePaths: string[] | undefined) => {
  if (!filePaths || filePaths.length !== 1 || typeof filePaths[0] !== 'string') {
    throw new Error('yt-dlp did not report exactly one downloaded audio file.');
  }

  const resolvedFolder = await fs.realpath(folder);
  const outputPath = path.resolve(filePaths[0]);
  const relativePath = path.relative(resolvedFolder, outputPath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('yt-dlp returned an audio path outside the download folder.');
  }

  if (!/^source\.[^./\\]+$/i.test(path.basename(outputPath))) {
    throw new Error('yt-dlp returned an unexpected audio file name.');
  }

  const entry = await fs.lstat(outputPath);

  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new Error('yt-dlp output is not a regular audio file.');
  }

  const realOutputPath = await fs.realpath(outputPath);
  const realRelativePath = path.relative(resolvedFolder, realOutputPath);

  if (!realRelativePath || realRelativePath.startsWith('..') || path.isAbsolute(realRelativePath)) {
    throw new Error('yt-dlp audio file resolves outside the download folder.');
  }

  return realOutputPath;
};

const getSoundCloudCoverPath = async (
  artworkUrl: string | null | undefined,
  options: Pick<ProviderDownloadOptions, 'folder' | 'signal' | 'track'>,
) => {
  const { folder, signal, track } = options;

  if (track.artwork || !artworkUrl) {
    return undefined;
  }

  signal?.throwIfAborted();
  const artworkUrl500px = artworkUrl.replace(/-large(?=\.|$)/i, '-t500x500');

  try {
    return await logTimedOperation(
      {
        startEvt: 'sc.cover.download.started',
        successEvt: 'sc.cover.download.completed',
        failureEvt: 'sc.cover.download.failed',
        startMessage: 'Downloading SoundCloud track cover',
        successMessage: 'Downloaded SoundCloud track cover',
        failureMessage: 'Failed to download SoundCloud track cover',
        bindings: {
          provider: 'soundcloud',
          ...getSafeUrlLogFields(artworkUrl500px),
          folder,
        },
      },
      () => saveThumbnailFromUrl(artworkUrl500px, path.join(folder, 'cover.png'), signal),
    );
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      throw error;
    }

    return undefined;
  }
};

const mapYtDlpFailure = (error: unknown) => {
  if (error instanceof HttpError) {
    return error;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined;
  const message = getErrorMessage(error).toLowerCase();

  if (code === 'ENOENT' || message.includes('spawn')) {
    return new HttpError(500, YTDLP_SPAWN_MESSAGE, {
      code: 'INTERNAL_ERROR',
    });
  }

  return new HttpError(502, YTDLP_UPSTREAM_MESSAGE, {
    code: 'UPSTREAM_FAILURE',
  });
};

export const downloadSoundCloudTrack = async (options: ProviderDownloadOptions) => {
  const { folder, signal, track } = options;
  const { url, name, album, lyrics } = track;
  const canonicalTrackUrl = normalizeSoundCloudTrackUrl(url);

  signal?.throwIfAborted();
  await fs.mkdir(folder, { recursive: true });

  const trackInfo = await getSoundCloudTrackDetails(canonicalTrackUrl, signal);
  signal?.throwIfAborted();
  const ytDlp = createYtDlp();
  const outputTemplate = path.join(folder, 'source.%(ext)s');
  let result;
  let ytDlpError: unknown;

  try {
    result = await logTimedOperation(
      {
        startEvt: 'sc.download.started',
        successEvt: 'sc.download.completed',
        failureEvt: 'sc.download.failed',
        startMessage: 'Downloading SoundCloud track audio',
        successMessage: 'Downloaded SoundCloud track audio',
        failureMessage: 'Failed to download SoundCloud track audio',
        bindings: {
          provider: 'soundcloud',
          ...getSafeUrlLogFields(canonicalTrackUrl),
          folder,
        },
      },
      async () => {
        try {
          return await runSignalAwareYtDlp(ytDlp, canonicalTrackUrl, outputTemplate, signal);
        } catch (error) {
          if (signal?.aborted || isAbortError(error)) {
            throw error;
          }

          // yt-dlp errors can include the input URL, including SoundCloud secret_token parameters.
          ytDlpError = error;
          throw new Error('yt-dlp audio command failed.');
        }
      },
    );
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    throw mapYtDlpFailure(ytDlpError ?? error);
  }

  signal?.throwIfAborted();
  const trackPath = await getActualAudioPath(folder, result.filePaths);
  signal?.throwIfAborted();

  const artworkUrl = trackInfo.artwork_url ?? trackInfo.user.avatar_url;
  const coverPath = await getSoundCloudCoverPath(artworkUrl, options);
  const trackName = (name ?? `${trackInfo.user.username} - ${trackInfo.title}`).trim();
  const processedTrack = await postProcessTrack({
    album: album?.trim(),
    coverPath: await resolveArtworkPath(track.artwork, folder, coverPath),
    folder,
    lyrics: lyrics?.trim(),
    name: trackName,
    signal,
    trackPath,
  });

  return processedTrack.filePath;
};
