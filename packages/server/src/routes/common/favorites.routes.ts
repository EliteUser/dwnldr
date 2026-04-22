import { Router } from 'express';
import { z } from 'zod';

import { getFavoritesByUserId } from '../../services/soundcloud.service.js';

const favoritesQuerySchema = z.object({
  userId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().optional(),
});

export const favoritesRouter = Router();

favoritesRouter.get('/favorites', async (req, res) => {
  const { userId, limit } = favoritesQuerySchema.parse(req.query);
  const favorites = await getFavoritesByUserId(userId, limit);

  res.json(favorites);
});
