import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { requireProviderByUrl } from '../../providers/index.js';
import { MAX_ARTWORK_SIZE } from '../../services/artwork/artwork.constants.js';
import { downloadTrack, streamFileToResponse } from '../../services/download/download.service.js';

const MAX_MULTIPART_FIELD_SIZE = 64 * 1024;
const MAX_MULTIPART_FIELD_COUNT = 5;

const downloadBodySchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().optional(),
  album: z.string().trim().optional(),
  artworkSource: z.enum(['custom']).optional(),
  lyrics: z.string().trim().optional(),
});

export const downloadRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: MAX_MULTIPART_FIELD_SIZE,
    fields: MAX_MULTIPART_FIELD_COUNT,
    fileSize: MAX_ARTWORK_SIZE,
    files: 1,
  },
});

downloadRouter.post('/download', upload.single('artwork'), async (req, res) => {
  const track = downloadBodySchema.parse(req.body);
  const file = req.file;
  const { artworkSource: _artworkSource, ...trackOptions } = track;

  if (track.artworkSource === 'custom' && !file) {
    throw new HttpError(400, 'Custom artwork file is required.', {
      code: 'INVALID_INPUT',
    });
  }

  if (file && track.artworkSource !== 'custom') {
    throw new HttpError(400, 'artworkSource=custom is required when uploading artwork.', {
      code: 'INVALID_INPUT',
    });
  }

  requireProviderByUrl(track.url);

  streamFileToResponse(
    res,
    await downloadTrack({
      ...trackOptions,
      ...(track.artworkSource === 'custom' &&
        file && {
          artwork: {
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName: file.originalname,
            size: file.size,
          },
        }),
    }),
  );
});
