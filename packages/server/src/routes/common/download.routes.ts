import { Router } from 'express';
import fs from 'node:fs';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error.js';
import { getLogger } from '../../lib/logger.js';
import { downloadTrack, scheduleDownloadCleanup } from '../../services/download.service.js';
import { classifySource } from '../../utils/index.js';
import { getContentDispositionHeader } from '../../utils/sanitize.utils.js';

const downloadBodySchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().optional(),
  album: z.string().trim().optional(),
  lyrics: z.string().trim().optional(),
});

export const downloadRouter = Router();

downloadRouter.post('/download', async (req, res) => {
  const track = downloadBodySchema.parse(req.body);
  const logger = getLogger({
    url: track.url,
  });

  if (!classifySource(track.url)) {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud or YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  const { downloadFolder, fileName, filePath, fileSize } = await downloadTrack(track);

  res.setHeader('Content-Length', fileSize);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', getContentDispositionHeader(fileName));

  const readStream = fs.createReadStream(filePath);
  const servedAt = Date.now();

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) {
      return;
    }

    cleaned = true;
    scheduleDownloadCleanup(downloadFolder);
  };

  readStream.on('error', (error) => {
    logger.error(
      {
        evt: 'download.stream.failed',
        ...(error instanceof Error ? { err: error } : { error: String(error) }),
      },
      'Failed to stream downloaded file',
    );

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error streaming file',
        code: 'INTERNAL_ERROR',
      });
    } else {
      res.end();
    }
  });

  res.once('finish', () => {
    logger.info(
      {
        evt: 'download.file.served',
        fileName,
        fileSize,
        durationMs: Date.now() - servedAt,
      },
      'Served downloaded file',
    );
  });

  res.once('finish', cleanup);
  res.once('close', cleanup);

  readStream.pipe(res);
});
