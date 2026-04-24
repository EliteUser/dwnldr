import path from 'node:path';

import { getExtension, renameFile } from '../utils/common.utils.js';
import { sanitizeFilename } from '../utils/sanitize.utils.js';
import { convertToMp3 } from './ffmpeg.service.js';
import { updateTrackMeta } from './metadata.service.js';

type PostProcessTrackOptions = {
  album?: string;
  coverPath?: string;
  folder: string;
  lyrics?: string;
  name: string;
  trackPath: string;
};

export const postProcessTrack = async (options: PostProcessTrackOptions) => {
  const { folder, trackPath, coverPath, name, album, lyrics } = options;
  const rawTrackName = name.trim();
  const sanitizedTrackName = sanitizeFilename(rawTrackName);

  const convertedTrackPath = await convertToMp3(trackPath);
  const finalTrackPath = path.join(folder, `${sanitizedTrackName}.mp3`);

  if (convertedTrackPath !== finalTrackPath) {
    await renameFile(convertedTrackPath, finalTrackPath);
  }

  let finalCoverPath: string | undefined;

  if (coverPath) {
    finalCoverPath = path.join(folder, `${sanitizedTrackName}.${getExtension(coverPath)}`);

    if (coverPath !== finalCoverPath) {
      await renameFile(coverPath, finalCoverPath);
    }
  }

  await updateTrackMeta({
    album: album?.trim(),
    coverPath: finalCoverPath,
    filePath: finalTrackPath,
    lyrics: lyrics?.trim(),
    name: rawTrackName,
  });

  return {
    coverPath: finalCoverPath,
    filePath: finalTrackPath,
    fileName: path.basename(finalTrackPath),
  };
};
