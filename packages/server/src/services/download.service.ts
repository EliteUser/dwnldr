import type { TrackOptions } from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { HttpError } from '../errors/http-error.js';
import { getLogger } from '../lib/logger.js';
import { soundcloud } from '../lib/soundcloud.js';
import { classifySource } from '../utils/common.utils.js';
import { downloadSoundCloudTrack } from '../utils/download.utils.js';
import { createDownloadFolder, removeFolder } from '../utils/temp.utils.js';
import { downloadYoutubeTrack } from '../utils/youtube.utils.js';

export type DownloadResult = {
  downloadFolder: string;
  fileName: string;
  filePath: string;
  fileSize: number;
};

export const downloadTrack = async (track: TrackOptions): Promise<DownloadResult> => {
  const downloadFolder = await createDownloadFolder();
  const source = classifySource(track.url);
  const logger = getLogger({
    downloadFolder,
  });

  if (!source) {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud or YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  logger.info(
    {
      evt: 'download.provider.selected',
      provider: source,
      url: track.url,
    },
    'Selected download provider',
  );

  const filePath =
    source === 'youtube'
      ? await downloadYoutubeTrack({
          track,
          folder: downloadFolder,
        })
      : await downloadSoundCloudTrack({
          api: soundcloud,
          track,
          folder: downloadFolder,
        });

  let stat;

  try {
    stat = await fs.stat(filePath);
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
