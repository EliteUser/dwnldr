import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { downloadTrack, streamFileToResponse } from '../../services/download.service.js';
import { classifySource } from '../../utils/index.js';

const downloadBodySchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().optional(),
  album: z.string().trim().optional(),
  lyrics: z.string().trim().optional(),
});

export const downloadRouter = Router();

downloadRouter.post('/download', async (req, res) => {
  const track = downloadBodySchema.parse(req.body);

  if (!classifySource(track.url)) {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud or YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  streamFileToResponse(res, await downloadTrack(track));
});
