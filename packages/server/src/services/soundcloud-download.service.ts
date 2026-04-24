import type { TrackOptions } from '../types.js';
import type { Soundcloud } from 'soundcloud.ts';

import fs from 'node:fs/promises';

import { callSoundCloudApi } from '../lib/soundcloud-api.js';
import { postProcessTrack } from './post-process.service.js';

type SoundCloudDownloadOptions = {
  api: Soundcloud;
  folder: string;
  track: TrackOptions;
};

export const downloadSoundCloudTrack = async (options: SoundCloudDownloadOptions) => {
  const { api, track, folder } = options;
  const { url, name, album, lyrics } = track;

  await fs.mkdir(folder, { recursive: true });

  const [trackPath, coverPath] = await callSoundCloudApi(
    {
      startEvt: 'sc.download.started',
      successEvt: 'sc.download.completed',
      failureEvt: 'sc.download.failed',
      startMessage: 'Downloading SoundCloud track assets',
      successMessage: 'Downloaded SoundCloud track assets',
      failureMessage: 'Failed to download SoundCloud track assets',
      bindings: {
        provider: 'soundcloud',
        url,
        folder,
      },
      notFoundMessage: 'Track not found',
    },
    () => Promise.all([api.util.downloadTrack(url, folder, false), api.util.downloadSongCover(url, folder)]),
  );

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
        url,
      },
      notFoundMessage: 'Track not found',
    },
    () => api.tracks.get(url),
  );

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
