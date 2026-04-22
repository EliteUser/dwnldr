import type { TrackProcessOptions, TrackProps } from '../types.js';

import NodeID3 from 'node-id3';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_ALBUM_NAME, IMAGE_EXTENSIONS } from '../constants.js';
import { getId } from './common.utils.js';

const getTrackTags = (options: TrackProps) => {
  const { name, album = DEFAULT_ALBUM_NAME, lyrics = '' } = options;
  const [artist, ...titleParts] = name!.split(' - ');
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

const getImageTags = (filePath: string) => {
  for (const extension of IMAGE_EXTENSIONS) {
    const imagePath = filePath.replace('.mp3', extension);

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);

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
    }
  }

  return {};
};

export const updateTrackMeta = async (options: TrackProcessOptions) => {
  const { folder, name, album, lyrics } = options;

  try {
    const filePath = path.join(folder, `${name}.mp3`);
    const tags = {
      ...getTrackTags({ name, album, lyrics }),
      ...getImageTags(filePath),
    };
    const trackTitle = `${tags.artist} - ${tags.title}`;

    return await new Promise<string>((resolve, reject) => {
      NodeID3.update(tags, filePath, (error: Error | null) => {
        if (error) {
          console.info(`Error processing ${trackTitle}`);
          reject(error);
          return;
        }

        console.info(`Processed: ${trackTitle}`);
        resolve(filePath);
      });
    });
  } catch (error) {
    console.error('Error updating track meta:', error);
    return undefined;
  }
};
