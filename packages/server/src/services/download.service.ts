import type { TrackOptions } from '../types.js';

import fs from 'node:fs';
import path from 'node:path';

import { HttpError } from '../errors/http-error.js';
import { soundcloud } from '../lib/soundcloud.js';
import { classifySource, getId, removeFolder } from '../utils/common.utils.js';
import { downloadSoundCloudTrack } from '../utils/download.utils.js';
import { downloadYoutubeTrack } from '../utils/youtube.utils.js';

export type DownloadResult = {
  downloadFolder: string;
  fileName: string;
  filePath: string;
  fileSize: number;
};

export const downloadTrack = async (track: TrackOptions): Promise<DownloadResult> => {
  const downloadFolder = path.resolve(process.cwd(), `track_${getId()}`);
  const source = classifySource(track.url);

  if (!source) {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud or YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

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

  if (!filePath || !fs.existsSync(filePath)) {
    throw new HttpError(404, 'File not found after download');
  }

  const stat = fs.statSync(filePath);

  return {
    downloadFolder,
    filePath,
    fileName: path.basename(filePath),
    fileSize: stat.size,
  };
};

export const scheduleDownloadCleanup = (downloadFolder: string) => {
  setTimeout(() => {
    removeFolder(downloadFolder);
  }, 5000);
};
