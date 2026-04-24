import type { TrackOptions } from '../types.js';
import type { Response } from 'express';

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { getLogger } from '../lib/logger.js';
import { soundcloud } from '../lib/soundcloud.js';
import { classifySource } from '../utils/common.utils.js';
import { getContentDispositionHeader } from '../utils/sanitize.utils.js';
import { createDownloadFolder, removeFolder } from '../utils/temp.utils.js';
import { downloadSoundCloudTrack } from './soundcloud-download.service.js';
import { downloadYoutubeTrack } from './youtube-download.service.js';

export type DownloadResult = {
  downloadFolder: string;
  fileName: string;
  filePath: string;
  fileSize: number;
};

const withDownloadTimeout = async <T>(
  operation: () => Promise<T>,
  options: {
    downloadFolder: string;
    source: 'soundcloud' | 'youtube';
  },
) =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const logger = getLogger({
      downloadFolder: options.downloadFolder,
      provider: options.source,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      removeFolder(options.downloadFolder);
      logger.error(
        {
          evt: 'download.timeout',
          timeoutMs: env.DOWNLOAD_TIMEOUT_MS,
        },
        'Download timed out before the file was ready',
      );
      reject(
        new HttpError(504, 'Download timed out before the file was ready.', {
          code: 'INTERNAL_ERROR',
          details: {
            timeoutMs: env.DOWNLOAD_TIMEOUT_MS,
          },
        }),
      );
    }, env.DOWNLOAD_TIMEOUT_MS);

    timeout.unref();

    void operation()
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
      });
  });

export const downloadTrack = async (track: TrackOptions): Promise<DownloadResult> => {
  const source = classifySource(track.url);

  if (!source) {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud or YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  const downloadFolder = await createDownloadFolder();
  const logger = getLogger({
    downloadFolder,
  });

  logger.info(
    {
      evt: 'download.provider.selected',
      provider: source,
      url: track.url,
    },
    'Selected download provider',
  );

  try {
    const filePath = await withDownloadTimeout(
      () =>
        source === 'youtube'
          ? downloadYoutubeTrack({
              track,
              folder: downloadFolder,
            })
          : downloadSoundCloudTrack({
              api: soundcloud,
              track,
              folder: downloadFolder,
            }),
      {
        downloadFolder,
        source,
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
    removeFolder(downloadFolder);
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
