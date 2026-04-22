import { Router } from 'express';
import { z } from 'zod';

import { getYouTubeTrackByUrl } from '../services/youtube.service.js';

const youTubeTrackQuerySchema = z.object({
  url: z.string().trim().url(),
});

export const youtubeRouter = Router();

youtubeRouter.get('/youtube/tracks', async (req, res) => {
  const { url } = youTubeTrackQuerySchema.parse(req.query);
  const track = await getYouTubeTrackByUrl(url);

  res.json(track);
});
