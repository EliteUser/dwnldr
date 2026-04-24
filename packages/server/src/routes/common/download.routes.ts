import { Router } from 'express';
import { z } from 'zod';

import { requireProviderByUrl } from '../../providers/index.js';
import { downloadTrack, streamFileToResponse } from '../../services/download.service.js';

const downloadBodySchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().optional(),
  album: z.string().trim().optional(),
  lyrics: z.string().trim().optional(),
});

export const downloadRouter = Router();

downloadRouter.post('/download', async (req, res) => {
  const track = downloadBodySchema.parse(req.body);

  requireProviderByUrl(track.url);

  streamFileToResponse(res, await downloadTrack(track));
});
