import type { TrackTags } from '@dwnldr/shared';
import NodeID3 from 'node-id3';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { getLogger } from '../lib/logger.js';
import { sanitizeFilename } from '../utils/sanitize.utils.js';
import { MAX_ARTWORK_DIMENSION } from './artwork/artwork.constants.js';

const DEFAULT_ALBUM = 'Music';
const MAX_COVER_SIZE = 1024;

export type TagInput = {
  album?: string;
  lyrics?: string;
  /** "Artist - Title"; the first " - " separates artist from title. */
  name: string;
};

/** Center-crops artwork to a square PNG of at most 1024 px. */
const saveCover = async (artworkPath: string, coverPath: string) => {
  const image = sharp(artworkPath, { failOn: 'error', limitInputPixels: MAX_ARTWORK_DIMENSION ** 2 });
  const { width = 0, height = 0 } = await image.metadata();
  const size = Math.min(width, height, MAX_COVER_SIZE);

  await image.resize(size, size, { fit: 'cover' }).png().toFile(coverPath);
};

const writeTags = async (audioPath: string, tags: TagInput, coverPath?: string) => {
  const [artist, ...titleParts] = tags.name.split(' - ');

  await NodeID3.Promise.update(
    {
      artist,
      title: titleParts.join(' - ') || artist,
      album: tags.album ?? DEFAULT_ALBUM,
      // Intentionally unique per track so players do not group every download into one shared album.
      performerInfo: crypto.randomBytes(4).toString('hex'),
      unsynchronisedLyrics: { language: 'eng', text: tags.lyrics ?? '' },
      ...(coverPath && {
        image: {
          mime: 'image/png',
          type: { id: 3, name: 'front cover' },
          description: 'Track Cover',
          imageBuffer: await fs.readFile(coverPath),
        },
      }),
    },
    audioPath,
  );
};

/**
 * Shared final step for every MP3 the app returns: cover, ID3 tags, and the "<name>.mp3" file name.
 * Without `artworkPath` the file keeps whatever cover it already has.
 */
export const finalizeTrack = async (options: {
  artworkPath?: string;
  audioPath: string;
  folder: string;
  tags: TagInput;
}) => {
  const { artworkPath, audioPath, folder, tags } = options;
  let coverPath: string | undefined;

  if (artworkPath) {
    try {
      coverPath = path.join(folder, 'cover.png');
      await saveCover(artworkPath, coverPath);
    } catch (error) {
      coverPath = undefined;
      getLogger().warn({ evt: 'track.cover.failed', err: error }, 'Could not prepare track cover');
    }
  }

  await writeTags(audioPath, tags, coverPath);

  const finalPath = path.join(folder, `${sanitizeFilename(tags.name)}.mp3`);

  if (finalPath !== audioPath) {
    await fs.rename(audioPath, finalPath);
  }

  return finalPath;
};

export const readTags = async (audioPath: string, fallbackName: string): Promise<TrackTags> => {
  const tags = await NodeID3.Promise.read(audioPath).catch((): NodeID3.Tags => ({}));
  const artist = tags.artist?.trim();
  const title = tags.title?.trim();
  const image = tags.image && typeof tags.image !== 'string' ? tags.image : undefined;

  return {
    album: tags.album?.trim() ?? '',
    artwork: image
      ? { dataUrl: `data:${image.mime};base64,${image.imageBuffer.toString('base64')}`, mimeType: image.mime }
      : null,
    lyrics: tags.unsynchronisedLyrics?.text?.trim() ?? '',
    name: artist && title ? `${artist} - ${title}` : title || artist || fallbackName,
  };
};
