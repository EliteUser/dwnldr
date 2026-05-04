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

export type DownloadResult = {
  downloadFolder: string;
  fileName: string;
  filePath: string;
  fileSize: number;
};

class DownloadTimeoutError extends HttpError {}

const withDownloadTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    downloadFolder: string;
    provider: string;
  },
) =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    const abortController = new AbortController();
    const logger = getLogger({
      downloadFolder: options.downloadFolder,
      provider: options.provider,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      timedOut = true;
      abortController.abort();
      logger.error(
        {
          evt: 'download.timeout',
          timeoutMs: env.DOWNLOAD_TIMEOUT_MS,
        },
        'Download timed out before the file was ready',
      );
      reject(
        new DownloadTimeoutError(504, 'Download timed out before the file was ready.', {
          code: 'INTERNAL_ERROR',
          details: {
            timeoutMs: env.DOWNLOAD_TIMEOUT_MS,
          },
        }),
      );
    }, env.DOWNLOAD_TIMEOUT_MS);

    timeout.unref();

    void operation(abortController.signal)
      .then((result) => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(result);
      })
      .catch((error: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      })
      .finally(() => {
        clearTimeout(timeout);

        if (timedOut && removeFolder(options.downloadFolder)) {
          logger.info(
            {
              evt: 'download.timeout.cleanup.executed',
            },
            'Cleaned up timed out download after provider work stopped',
          );
        }
      });
  });

export const downloadTrack = async (track: TrackOptions): Promise<DownloadResult> => {
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
      url: track.url,
    },
    'Selected download provider',
  );

  try {
    const filePath = await withDownloadTimeout(
      (signal) =>
        providerDownloadTrack({
          track,
          folder: downloadFolder,
          signal,
        }),
      {
        downloadFolder,
        provider: provider.key,
      },
    );

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
    if (!(error instanceof DownloadTimeoutError)) {
      removeFolder(downloadFolder);
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
