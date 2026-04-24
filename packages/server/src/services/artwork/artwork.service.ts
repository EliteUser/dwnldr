import type { UploadedArtwork } from './artwork.types.js';

import path from 'node:path';
import sharp from 'sharp';

import { IMAGE_EXTENSIONS } from '../../constants.js';
import {
  ALLOWED_ARTWORK_MIME_TYPES,
  ARTWORK_OUTPUT_SIZE,
  MAX_ARTWORK_DIMENSION,
  MAX_ARTWORK_SIZE,
  MIN_ARTWORK_DIMENSION,
} from './artwork.constants.js';
import { getArtworkExtension, throwInvalidArtwork } from './artwork.utils.js';

export const assertUploadedArtwork = async (artwork: UploadedArtwork) => {
  const extension = getArtworkExtension(artwork.originalName);

  if (!IMAGE_EXTENSIONS.includes(extension) && extension !== '.webp') {
    throwInvalidArtwork('Artwork must be a JPEG, PNG, or WebP image.', {
      extension,
    });
  }

  if (!ALLOWED_ARTWORK_MIME_TYPES.has(artwork.mimeType)) {
    throwInvalidArtwork('Artwork must be a JPEG, PNG, or WebP image.', {
      mimeType: artwork.mimeType,
    });
  }

  if (artwork.size > MAX_ARTWORK_SIZE) {
    throwInvalidArtwork('Artwork must be 8 MB or smaller.', {
      maxSize: MAX_ARTWORK_SIZE,
    });
  }

  let width: number | undefined;
  let height: number | undefined;

  try {
    const metadata = await sharp(artwork.buffer, {
      failOn: 'error',
    }).metadata();
    width = metadata.width;
    height = metadata.height;
  } catch {
    throwInvalidArtwork('Artwork image could not be decoded.');
  }

  if (typeof width !== 'number' || typeof height !== 'number') {
    throwInvalidArtwork('Artwork image dimensions could not be read.');
    return;
  }

  const imageWidth = width;
  const imageHeight = height;

  if (imageWidth < MIN_ARTWORK_DIMENSION || imageHeight < MIN_ARTWORK_DIMENSION) {
    throwInvalidArtwork('Artwork must be at least 128 x 128 pixels.', {
      width: imageWidth,
      height: imageHeight,
    });
  }

  if (imageWidth > MAX_ARTWORK_DIMENSION || imageHeight > MAX_ARTWORK_DIMENSION) {
    throwInvalidArtwork('Artwork must be 8000 x 8000 pixels or smaller.', {
      width: imageWidth,
      height: imageHeight,
    });
  }
};

export const saveNormalizedArtwork = async (artwork: UploadedArtwork, folder: string) => {
  await assertUploadedArtwork(artwork);

  const outputPath = path.join(folder, 'custom-artwork.png');

  await sharp(artwork.buffer)
    .resize(ARTWORK_OUTPUT_SIZE, ARTWORK_OUTPUT_SIZE, {
      fit: 'cover',
    })
    .png()
    .toFile(outputPath);

  return outputPath;
};

export const resolveArtworkPath = async (
  artwork: UploadedArtwork | undefined,
  folder: string,
  providerArtworkPath?: string,
) => {
  if (!artwork) {
    return providerArtworkPath;
  }

  return saveNormalizedArtwork(artwork, folder);
};
