import type { SoundcloudTrack, SoundcloudUser } from 'soundcloud.ts';

import { HttpError } from '../errors/http-error.js';
import { callSoundCloudApi } from '../lib/soundcloud-api.js';
import { soundcloud } from '../lib/soundcloud.js';
import { getSoundCloudTrackData } from './track-metadata.service.js';

export const getUserById = async (userId: string): Promise<SoundcloudUser> => {
  const user = await callSoundCloudApi(
    {
      startEvt: 'sc.user.fetch.started',
      successEvt: 'sc.user.fetch.completed',
      failureEvt: 'sc.user.fetch.failed',
      startMessage: 'Fetching SoundCloud user',
      successMessage: 'Fetched SoundCloud user',
      failureMessage: 'Failed to fetch SoundCloud user',
      bindings: {
        provider: 'soundcloud',
        userId,
      },
      notFoundMessage: `User with id ${userId} not found`,
    },
    () => soundcloud.users.get(userId),
  );

  if (!user) {
    throw new HttpError(404, `User with id ${userId} not found`, {
      code: 'INVALID_INPUT',
    });
  }

  return user;
};

export const getSoundCloudTrackByUrl = async (url: string) => {
  const track = await callSoundCloudApi(
    {
      startEvt: 'sc.track.fetch.started',
      successEvt: 'sc.track.fetch.completed',
      failureEvt: 'sc.track.fetch.failed',
      startMessage: 'Fetching SoundCloud track metadata',
      successMessage: 'Fetched SoundCloud track metadata',
      failureMessage: 'Failed to fetch SoundCloud track metadata',
      bindings: {
        provider: 'soundcloud',
        url,
      },
      notFoundMessage: 'Track not found',
    },
    () => soundcloud.tracks.get(url),
  );

  if (!track) {
    throw new HttpError(404, 'Track not found', {
      code: 'INVALID_INPUT',
    });
  }

  return getSoundCloudTrackData(track);
};

export const getFavoritesByUserId = async (userId: string, limit?: number) => {
  const user = await getUserById(userId);
  const favorites = await callSoundCloudApi(
    {
      startEvt: 'sc.likes.fetch.started',
      successEvt: 'sc.likes.fetch.completed',
      failureEvt: 'sc.likes.fetch.failed',
      startMessage: 'Fetching SoundCloud likes',
      successMessage: 'Fetched SoundCloud likes',
      failureMessage: 'Failed to fetch SoundCloud likes',
      bindings: {
        provider: 'soundcloud',
        userId,
        limit,
      },
    },
    () => soundcloud.users.likes(user.id, limit),
  );

  return favorites
    .filter((track): track is SoundcloudTrack => Boolean(track))
    .map((track) => getSoundCloudTrackData(track));
};
