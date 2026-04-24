import type { Crop, PixelCrop } from 'react-image-crop';

import { centerCrop, makeAspectCrop } from 'react-image-crop';

import {
  ACCEPTED_ARTWORK_EXTENSIONS,
  ACCEPTED_ARTWORK_MIME_TYPES,
  ARTWORK_OUTPUT_SIZE,
  ARTWORK_PREVIEW_QUALITY,
  MAX_ARTWORK_FILE_SIZE,
  MAX_ARTWORK_IMAGE_SIZE,
  MIN_ARTWORK_IMAGE_SIZE,
} from './artwork-editor.constants';

export const getCenteredSquareCrop = (width: number, height: number): Crop => {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      1,
      width,
      height,
    ),
    width,
    height,
  );
};

export const loadImage = async (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be decoded.'));
    image.src = url;
  });

export const validateArtworkFile = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!ACCEPTED_ARTWORK_EXTENSIONS.has(extension) || !ACCEPTED_ARTWORK_MIME_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG, or WebP image.');
  }

  if (file.size > MAX_ARTWORK_FILE_SIZE) {
    throw new Error('Artwork must be 8 MB or smaller.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (width < MIN_ARTWORK_IMAGE_SIZE || height < MIN_ARTWORK_IMAGE_SIZE) {
      throw new Error('Artwork must be at least 128 x 128 pixels.');
    }

    if (width > MAX_ARTWORK_IMAGE_SIZE || height > MAX_ARTWORK_IMAGE_SIZE) {
      throw new Error('Artwork must be 8000 x 8000 pixels or smaller.');
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const renderCroppedArtwork = async (image: HTMLImageElement, crop: PixelCrop) =>
  new Promise<File>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Artwork preview is not available in this browser.'));
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = ARTWORK_OUTPUT_SIZE;
    canvas.height = ARTWORK_OUTPUT_SIZE;
    try {
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        ARTWORK_OUTPUT_SIZE,
        ARTWORK_OUTPUT_SIZE,
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not prepare artwork.'));
            return;
          }

          resolve(new File([blob], 'artwork.png', { type: 'image/png' }));
        },
        'image/png',
        ARTWORK_PREVIEW_QUALITY,
      );
    } catch {
      reject(new Error('This artwork cannot be edited in the browser. Upload a local copy to continue.'));
    }
  });
