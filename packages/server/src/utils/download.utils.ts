import type { TrackOptions } from '../types.js';
import type { Soundcloud } from 'soundcloud.ts';

import fs from 'node:fs/promises';

import { getErrorStatus, SOUNDCLOUD_UNAUTHORIZED_MESSAGE, toSoundCloudHttpError } from '../errors/upstream-error.js';
import { logTimedOperation } from '../lib/logger.js';
import { postProcessTrack } from './post-process.utils.js';

type SoundCloudDownloadOptions = {
  api: Soundcloud;
  track: TrackOptions;
  folder: string;
};

export const downloadSoundCloudTrack = async (options: SoundCloudDownloadOptions) => {
  const { api, track, folder } = options;
  const { url, name, album, lyrics } = track;

  await fs.mkdir(folder, { recursive: true });

  const [trackPath, coverPath] = await logTimedOperation(
    {
      startEvt: 'sc.download.started',
      successEvt: 'sc.download.completed',
      failureEvt: (error) =>
        getErrorStatus(error) === 401 || getErrorStatus(error) === 403 ? 'sc.api.unauthorized' : 'sc.download.failed',
      startMessage: 'Downloading SoundCloud track assets',
      successMessage: 'Downloaded SoundCloud track assets',
      failureMessage: (error) =>
        getErrorStatus(error) === 401 || getErrorStatus(error) === 403
          ? SOUNDCLOUD_UNAUTHORIZED_MESSAGE
          : 'Failed to download SoundCloud track assets',
      bindings: {
        provider: 'soundcloud',
        url,
        folder,
      },
    },
    () => Promise.all([api.util.downloadTrack(url, folder, false), api.util.downloadSongCover(url, folder)]),
  ).catch((error: unknown) => {
    throw toSoundCloudHttpError(error, {
      notFoundMessage: 'Track not found',
    });
  });

  const trackInfo = await logTimedOperation(
    {
      startEvt: 'sc.track.fetch.started',
      successEvt: 'sc.track.fetch.completed',
      failureEvt: (error) =>
        getErrorStatus(error) === 401 || getErrorStatus(error) === 403
          ? 'sc.api.unauthorized'
          : 'sc.track.fetch.failed',
      startMessage: 'Fetching SoundCloud track details',
      successMessage: 'Fetched SoundCloud track details',
      failureMessage: (error) =>
        getErrorStatus(error) === 401 || getErrorStatus(error) === 403
          ? SOUNDCLOUD_UNAUTHORIZED_MESSAGE
          : 'Failed to fetch SoundCloud track details',
      bindings: {
        provider: 'soundcloud',
        url,
      },
    },
    () => api.tracks.get(url),
  ).catch((error: unknown) => {
    throw toSoundCloudHttpError(error, {
      notFoundMessage: 'Track not found',
    });
  });

  const trackName = (name ?? `${trackInfo.user.username} - ${trackInfo.title}`).trim();

  const processedTrack = await postProcessTrack({
    album: album?.trim(),
    coverPath,
    folder,
    lyrics: lyrics?.trim(),
    name: trackName,
    trackPath,
  });

  return processedTrack.filePath;
};
