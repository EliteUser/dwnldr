import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { getSoundCloudTrackByUrl } from '../../services/soundcloud.service.js';
import { classifySource } from '../../utils/index.js';

const soundCloudTrackQuerySchema = z.object({
  url: z.string().trim().url(),
});

export const soundcloudRouter = Router();

soundcloudRouter.get('/soundcloud/tracks', async (req, res) => {
  const { url } = soundCloudTrackQuerySchema.parse(req.query);

  if (classifySource(url) !== 'soundcloud') {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  const track = await getSoundCloudTrackByUrl(url);

  res.json(track);
});
