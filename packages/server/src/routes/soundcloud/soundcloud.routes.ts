import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { getProvider, requireProviderFeature, classifySource } from '../../providers/index.js';

const soundCloudTrackQuerySchema = z.object({
  url: z.string().trim().url(),
});

const soundCloudUserQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

const soundCloudFavoritesQuerySchema = z.object({
  userId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().optional(),
});

export const soundcloudRouter = Router();

soundcloudRouter.get('/soundcloud/users', async (req, res) => {
  const { userId } = soundCloudUserQuerySchema.parse(req.query);
  const provider = getProvider('soundcloud');
  const getUser = requireProviderFeature(provider, 'getUser');

  res.json(await getUser(userId));
});

soundcloudRouter.get('/soundcloud/favorites', async (req, res) => {
  const { userId, limit } = soundCloudFavoritesQuerySchema.parse(req.query);
  const provider = getProvider('soundcloud');
  const fetchFavorites = requireProviderFeature(provider, 'fetchFavorites');

  res.json(await fetchFavorites(userId, limit));
});

soundcloudRouter.get('/soundcloud/tracks', async (req, res) => {
  const { url } = soundCloudTrackQuerySchema.parse(req.query);

  if (classifySource(url) !== 'soundcloud') {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  const provider = getProvider('soundcloud');
  const resolveTrack = requireProviderFeature(provider, 'resolveTrack');
  const track = await resolveTrack(url);

  res.json(track);
});
