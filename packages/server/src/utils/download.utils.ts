import type { TrackOptions } from '../types.js';
import type { Soundcloud } from 'soundcloud.ts';

import path from 'node:path';

import { getErrorStatus, SOUNDCLOUD_UNAUTHORIZED_MESSAGE, toSoundCloudHttpError } from '../errors/upstream-error.js';
import { logTimedOperation } from '../lib/logger.js';
import { getExtension, renameFile } from './common.utils.js';
import { convertToMp3 } from './convert.utils.js';
import { updateTrackMeta } from './metadata.utils.js';

type SoundCloudDownloadOptions = {
  api: Soundcloud;
  track: TrackOptions;
  folder: string;
};

export const downloadSoundCloudTrack = async (options: SoundCloudDownloadOptions) => {
  const { api, track, folder } = options;
  const { url, name, album, lyrics } = track;

  let [trackPath, coverPath] = await logTimedOperation(
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

  if (getExtension(trackPath) !== 'mp3') {
    trackPath = await convertToMp3(trackPath);
  }

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

  const newTrackPath = path.join(folder, `${trackName}.${getExtension(trackPath)}`);
  const newCoverPath = path.join(folder, `${trackName}.${getExtension(coverPath)}`);

  await Promise.all([renameFile(trackPath, newTrackPath), renameFile(coverPath, newCoverPath)]);

  await updateTrackMeta({
    folder,
    name: trackName,
    album: album?.trim(),
    lyrics: lyrics?.trim(),
  });

  return newTrackPath;
};
