import NodeID3 from 'node-id3';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_ALBUM_NAME, IMAGE_EXTENSIONS } from '../../constants.js';
import { HttpError } from '../../errors/http-error.js';
import { getLogger } from '../../lib/logger.js';
import type { TrackProcessOptions } from '../../types.js';
import { getId } from '../../utils/common.utils.js';

const getTrackTags = (options: Pick<TrackProcessOptions, 'album' | 'lyrics' | 'name'>) => {
  const { name, album = DEFAULT_ALBUM_NAME, lyrics = '' } = options;
  const [artist, ...titleParts] = name.split(' - ');
  const title = titleParts.join(' - ') || artist;

  return {
    artist,
    performerInfo: getId(),
    title,
    album,
    unsynchronisedLyrics: {
      language: 'eng',
      text: lyrics,
    },
  };
};

const getImageTagFromPath = (imagePath: string) => {
  if (!fs.existsSync(imagePath)) {
    return {};
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const extension = path.extname(imagePath).toLowerCase();

  return {
    image: {
      mime: extension === '.png' ? 'image/png' : 'image/jpeg',
      type: {
        id: 0x03,
        name: 'front cover',
      },
      description: 'Track Cover',
      imageBuffer,
    },
  };
};

const getImageTags = (filePath: string, coverPath?: string) => {
  if (coverPath) {
    return getImageTagFromPath(coverPath);
  }

  for (const extension of IMAGE_EXTENSIONS) {
    const imagePath = filePath.replace('.mp3', extension);
    const imageTags = getImageTagFromPath(imagePath);

    if ('image' in imageTags) {
      return imageTags;
    }
  }

  return {};
};

export const updateTrackMeta = async (options: TrackProcessOptions) => {
  const { coverPath, filePath, name, album, lyrics } = options;
  const folder = path.dirname(filePath);
  const logger = getLogger({
    folder,
    trackName: name,
  });

  const tags = {
    ...getTrackTags({ name, album, lyrics }),
    ...getImageTags(filePath, coverPath),
  };
  const trackTitle = `${tags.artist} - ${tags.title}`;

  return await new Promise<string>((resolve, reject) => {
    NodeID3.update(tags, filePath, (error: Error | null) => {
      if (error) {
        logger.error(
          {
            evt: 'metadata.write.failed',
            err: error,
          },
          `Failed to write metadata for ${trackTitle}`,
        );
        reject(
          new HttpError(500, 'Failed to write track metadata', {
            code: 'INTERNAL_ERROR',
          }),
        );
        return;
      }

      logger.info(
        {
          evt: 'metadata.write.completed',
          filePath,
        },
        `Wrote metadata for ${trackTitle}`,
      );
      resolve(filePath);
    });
  });
};
