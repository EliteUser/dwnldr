import { Router } from 'express';
import fs from 'node:fs';
import { z } from 'zod';

import { downloadTrack, scheduleDownloadCleanup } from '../services/download.service.js';

const downloadBodySchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().optional(),
  album: z.string().trim().optional(),
  lyrics: z.string().trim().optional(),
});

export const downloadRouter = Router();

downloadRouter.post('/download', async (req, res) => {
  const track = downloadBodySchema.parse(req.body);
  const { downloadFolder, fileName, filePath, fileSize } = await downloadTrack(track);

  res.setHeader('Content-Length', fileSize);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const readStream = fs.createReadStream(filePath);

  const cleanup = () => {
    scheduleDownloadCleanup(downloadFolder);
  };

  readStream.on('error', (error) => {
    console.error('Stream error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error streaming file',
      });
    } else {
      res.end();
    }
  });

  res.on('finish', cleanup);
  res.on('close', cleanup);

  readStream.pipe(res);
});
