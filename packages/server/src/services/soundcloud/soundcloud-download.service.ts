import fs from 'node:fs/promises';
import path from 'node:path';
import type { Soundcloud } from 'soundcloud.ts';

import { isAbortError } from '../../errors/error-utils.js';
import { logTimedOperation } from '../../lib/logger.js';
import { callSoundCloudApi } from '../../lib/soundcloud-api.js';
import type { TrackOptions } from '../../types.js';
import { getSafeUrlLogFields } from '../../utils/url-log.utils.js';
import { resolveArtworkPath } from '../artwork/artwork.service.js';
import { postProcessTrack } from '../media/post-process.service.js';
import { saveThumbnailFromUrl } from '../media/thumbnail.service.js';

type SoundCloudDownloadOptions = {
  api: Soundcloud;
  folder: string;
  signal?: AbortSignal;
  track: TrackOptions;
};

const getSoundCloudCoverPath = async (
  artworkUrl: string | undefined,
  options: Pick<SoundCloudDownloadOptions, 'folder' | 'signal' | 'track'>,
) => {
  const { folder, signal, track } = options;

  if (track.artwork || !artworkUrl) {
    return undefined;
  }

  signal?.throwIfAborted();

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
          ...getSafeUrlLogFields(artworkUrl),
          folder,
        },
      },
      () => saveThumbnailFromUrl(artworkUrl, path.join(folder, 'cover.png'), signal),
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return undefined;
  }
};

export const downloadSoundCloudTrack = async (options: SoundCloudDownloadOptions) => {
  const { api, track, folder, signal } = options;
  const { url, name, album, lyrics } = track;

  signal?.throwIfAborted();

  await fs.mkdir(folder, { recursive: true });

  const trackPath = await callSoundCloudApi(
    {
      startEvt: 'sc.download.started',
      successEvt: 'sc.download.completed',
      failureEvt: 'sc.download.failed',
      startMessage: 'Downloading SoundCloud track audio',
      successMessage: 'Downloaded SoundCloud track audio',
      failureMessage: 'Failed to download SoundCloud track audio',
      bindings: {
        provider: 'soundcloud',
        ...getSafeUrlLogFields(url),
        folder,
      },
      notFoundMessage: 'Track not found',
    },
    () => api.util.downloadTrack(url, folder, false),
  );

  signal?.throwIfAborted();

  const trackInfo = await callSoundCloudApi(
    {
      startEvt: 'sc.track.fetch.started',
      successEvt: 'sc.track.fetch.completed',
      failureEvt: 'sc.track.fetch.failed',
      startMessage: 'Fetching SoundCloud track details',
      successMessage: 'Fetched SoundCloud track details',
      failureMessage: 'Failed to fetch SoundCloud track details',
      bindings: {
        provider: 'soundcloud',
        ...getSafeUrlLogFields(url),
      },
      notFoundMessage: 'Track not found',
    },
    () => api.tracks.get(url),
  );

  signal?.throwIfAborted();

  const artworkUrl = (trackInfo.artwork_url || trackInfo.user.avatar_url)?.replace('-large', '-t500x500');
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
