import { Router } from 'express';
import { z } from 'zod';

import { fetchRemoteArtwork } from '../../services/artwork/remote-artwork.service.js';

const remoteArtworkQuerySchema = z.object({
  url: z.string().trim().url(),
});

export const artworkRouter = Router();

artworkRouter.get('/artwork', async (req, res) => {
  const { url } = remoteArtworkQuerySchema.parse(req.query);
  const artwork = await fetchRemoteArtwork(url);

  res
    .status(200)
    .type(artwork.mimeType)
    .set({
      'Cache-Control': 'no-store',
      'Content-Length': artwork.buffer.length.toString(),
    })
    .send(artwork.buffer);
});
