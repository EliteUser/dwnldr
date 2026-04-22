import { Router } from 'express';
import { z } from 'zod';

import { getSoundCloudTrackByUrl } from '../services/soundcloud.service.js';

const soundCloudTrackQuerySchema = z.object({
  url: z.string().trim().url(),
});

export const soundcloudRouter = Router();

soundcloudRouter.get('/soundcloud/tracks', async (req, res) => {
  const { url } = soundCloudTrackQuerySchema.parse(req.query);
  const track = await getSoundCloudTrackByUrl(url);

  res.json(track);
});
