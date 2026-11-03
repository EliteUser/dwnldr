import sharp, { type Metadata } from 'sharp';

import { HttpError } from '../../errors/http-error.js';
import { MAX_ARTWORK_DIMENSION, MAX_ARTWORK_SIZE, MIN_ARTWORK_DIMENSION } from './artwork.constants.js';

const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

const invalidArtwork = (message: string) => new HttpError(400, message, { code: 'INVALID_INPUT' });

/** Validates an uploaded artwork file by decoding it rather than trusting its name or MIME type. */
export const assertArtworkFile = async (file: { path: string; size: number }) => {
  if (file.size > MAX_ARTWORK_SIZE) {
    throw invalidArtwork('Artwork must be 8 MB or smaller.');
  }

  let metadata: Metadata;

  try {
    metadata = await sharp(file.path, { failOn: 'error' }).metadata();
  } catch {
    throw invalidArtwork('Artwork image could not be decoded.');
  }

  const { format, height = 0, width = 0 } = metadata;

  if (!SUPPORTED_FORMATS.has(format)) {
    throw invalidArtwork('Artwork must be a JPEG, PNG, or WebP image.');
  }

  if (width < MIN_ARTWORK_DIMENSION || height < MIN_ARTWORK_DIMENSION) {
    throw invalidArtwork('Artwork must be at least 128 x 128 pixels.');
  }

  if (width > MAX_ARTWORK_DIMENSION || height > MAX_ARTWORK_DIMENSION) {
    throw invalidArtwork('Artwork must be 8000 x 8000 pixels or smaller.');
  }
};
