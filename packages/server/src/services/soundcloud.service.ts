import type { SoundcloudTrack, SoundcloudUser } from 'soundcloud.ts';

import { HttpError } from '../errors/http-error.js';
import { soundcloud } from '../lib/soundcloud.js';
import { getSoundCloudTrackData } from './track-metadata.service.js';

export const getUserById = async (userId: string): Promise<SoundcloudUser> => {
  const user = await soundcloud.users.get(userId);

  if (!user) {
    throw new HttpError(404, `User with id ${userId} not found`);
  }

  return user;
};

export const getSoundCloudTrackByUrl = async (url: string) => {
  const track = await soundcloud.tracks.get(url);

  if (!track) {
    throw new HttpError(404, 'Track not found');
  }

  return getSoundCloudTrackData(track);
};

export const getFavoritesByUserId = async (userId: string, limit?: number) => {
  const user = await getUserById(userId);
  const favorites = await soundcloud.users.likes(user.id, limit);

  return favorites
    .filter((track): track is SoundcloudTrack => Boolean(track))
    .map((track) => getSoundCloudTrackData(track));
};
