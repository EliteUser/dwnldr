import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { MAX_ARTWORK_SIZE } from '../../services/artwork/artwork.constants.js';
import { streamFileToResponse } from '../../services/download/download.service.js';
import { inspectLocalTrack, rewriteLocalTrack } from '../../services/track-meta/track-meta.service.js';

const MAX_AUDIO_SIZE = 150 * 1024 * 1024;
const MAX_MULTIPART_FIELD_SIZE = 64 * 1024;
const MAX_MULTIPART_FIELD_COUNT = 4;

const metaBodySchema = z.object({
  name: z.string().trim().min(1),
  album: z.string().trim().optional(),
  artworkSource: z.enum(['custom']).optional(),
  lyrics: z.string().trim().optional(),
});

const getUploadedFile = (
  files: Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined,
  key: string,
) => (Array.isArray(files) ? undefined : files?.[key]?.[0]);

export const trackMetaRouter = Router();
const uploadStorage: multer.StorageEngine = {
  _handleFile(_req, file, callback) {
    const maxSize = file.fieldname === 'artwork' ? MAX_ARTWORK_SIZE : MAX_AUDIO_SIZE;
    const chunks: Buffer[] = [];
    let completed = false;
    let size = 0;

    const fail = (error: Error) => {
      if (completed) {
        return;
      }

      completed = true;
      callback(error);
    };

    file.stream.on('data', (chunk: Buffer) => {
      if (completed) {
        return;
      }

      size += chunk.length;

      if (size > maxSize) {
        fail(new multer.MulterError('LIMIT_FILE_SIZE', file.fieldname));
        file.stream.resume();
        return;
      }

      chunks.push(chunk);
    });

    file.stream.on('error', fail);
    file.stream.on('end', () => {
      if (completed) {
        return;
      }

      completed = true;
      callback(null, {
        buffer: Buffer.concat(chunks),
        size,
      });
    });
  },
  _removeFile(_req, _file, callback) {
    callback(null);
  },
};
const upload = multer({
  storage: uploadStorage,
  limits: {
    fieldSize: MAX_MULTIPART_FIELD_SIZE,
    fields: MAX_MULTIPART_FIELD_COUNT,
    fileSize: MAX_AUDIO_SIZE,
    files: 2,
  },
});

trackMetaRouter.post('/meta/inspect', upload.single('audio'), async (req, res) => {
  const audio = req.file;

  if (!audio) {
    throw new HttpError(400, 'Audio file is required.', {
      code: 'INVALID_INPUT',
    });
  }

  res.json(
    await inspectLocalTrack({
      buffer: audio.buffer,
      mimeType: audio.mimetype,
      originalName: audio.originalname,
      size: audio.size,
    }),
  );
});

trackMetaRouter.post(
  '/meta/download',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'artwork', maxCount: 1 },
  ]),
  async (req, res) => {
    const body = metaBodySchema.parse(req.body);
    const audio = getUploadedFile(req.files, 'audio');
    const artwork = getUploadedFile(req.files, 'artwork');

    if (!audio) {
      throw new HttpError(400, 'Audio file is required.', {
        code: 'INVALID_INPUT',
      });
    }

    if (body.artworkSource === 'custom' && !artwork) {
      throw new HttpError(400, 'Custom artwork file is required.', {
        code: 'INVALID_INPUT',
      });
    }

    if (artwork && body.artworkSource !== 'custom') {
      throw new HttpError(400, 'artworkSource=custom is required when uploading artwork.', {
        code: 'INVALID_INPUT',
      });
    }

    streamFileToResponse(
      res,
      await rewriteLocalTrack({
        album: body.album,
        artwork: artwork
          ? {
              buffer: artwork.buffer,
              mimeType: artwork.mimetype,
              originalName: artwork.originalname,
              size: artwork.size,
            }
          : undefined,
        audio: {
          buffer: audio.buffer,
          mimeType: audio.mimetype,
          originalName: audio.originalname,
          size: audio.size,
        },
        lyrics: body.lyrics,
        name: body.name,
      }),
    );
  },
);
