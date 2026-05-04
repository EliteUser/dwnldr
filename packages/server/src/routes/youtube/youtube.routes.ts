import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { getProvider, requireProviderFeature, classifySource } from '../../providers/index.js';

const youTubeTrackQuerySchema = z.object({
  url: z.string().trim().url(),
});

export const youtubeRouter = Router();

youtubeRouter.get('/youtube/tracks', async (req, res) => {
  const { url } = youTubeTrackQuerySchema.parse(req.query);

  if (classifySource(url) !== 'youtube') {
    throw new HttpError(400, 'Unsupported URL source. Use a YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  const provider = getProvider('youtube');
  const resolveTrack = requireProviderFeature(provider, 'resolveTrack');
  const track = await resolveTrack(url);

  res.json(track);
});
