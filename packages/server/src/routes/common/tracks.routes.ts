import { Router } from 'express';
import { z } from 'zod';

import { requireProviderByUrl, requireProviderFeature } from '../../providers/index.js';

const trackQuerySchema = z.object({
  url: z.string().trim().url(),
});

export const tracksRouter = Router();

tracksRouter.get('/tracks', async (req, res) => {
  const { url } = trackQuerySchema.parse(req.query);
  const provider = requireProviderByUrl(url);
  const resolveTrack = requireProviderFeature(provider, 'resolveTrack');

  res.json(await resolveTrack(url));
});
