import type { Response } from 'express';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import { HttpError } from '../../errors/http-error.js';
import { getLogger } from '../../lib/logger.js';
import { requireProviderByUrl, requireProviderFeature } from '../../providers/index.js';
import type { TrackOptions } from '../../types.js';
import { getContentDispositionHeader } from '../../utils/sanitize.utils.js';
import { createDownloadFolder, removeFolder } from '../../utils/temp.utils.js';
import { getSafeUrlLogFields } from '../../utils/url-log.utils.js';

export type DownloadResult = {
  downloadFolder: string;
  fileName: string;
  filePath: string;
  fileSize: number;
};

export const downloadTrack = async (track: TrackOptions, requestSignal: AbortSignal): Promise<DownloadResult> => {
  const provider = requireProviderByUrl(track.url);
  const providerDownloadTrack = requireProviderFeature(provider, 'downloadTrack');

  const downloadFolder = await createDownloadFolder();
  const logger = getLogger({
    downloadFolder,
  });

  logger.info(
    {
      evt: 'download.provider.selected',
      provider: provider.key,
      ...getSafeUrlLogFields(track.url),
    },
    'Selected download provider',
  );

  const timeoutSignal = AbortSignal.timeout(env.DOWNLOAD_TIMEOUT_MS);

  try {
    const filePath = await providerDownloadTrack({
      track,
      folder: downloadFolder,
      signal: AbortSignal.any([requestSignal, timeoutSignal]),
    });

    let stat;

    try {
      stat = await fsPromises.stat(filePath);
    } catch {
      throw new HttpError(500, 'File not found after download', {
        code: 'INTERNAL_ERROR',
      });
    }

    return {
      downloadFolder,
      filePath,
      fileName: path.basename(filePath),
      fileSize: stat.size,
    };
  } catch (error) {
    // Providers settle only after their subprocesses exit, so the folder is no longer in use here.
    removeFolder(downloadFolder);

    if (timeoutSignal.aborted) {
      logger.error({ evt: 'download.timeout', timeoutMs: env.DOWNLOAD_TIMEOUT_MS }, 'Download timed out');
      throw new HttpError(504, 'Download timed out before the file was ready.', {
        code: 'INTERNAL_ERROR',
      });
    }

    throw error;
  }
};

export const scheduleDownloadCleanup = (downloadFolder: string) => {
  const logger = getLogger({
    downloadFolder,
  });

  logger.info(
    {
      evt: 'download.cleanup.scheduled',
      delayMs: 5000,
    },
    'Scheduled download cleanup',
  );

  setTimeout(() => {
    if (removeFolder(downloadFolder)) {
      logger.info(
        {
          evt: 'download.cleanup.executed',
        },
        'Executed download cleanup',
      );
    }
  }, 5000);
};

export const streamFileToResponse = (res: Response, result: DownloadResult) => {
  const { downloadFolder, fileName, filePath, fileSize } = result;
  const logger = getLogger({
    downloadFolder,
    fileName,
    filePath,
  });

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
};
