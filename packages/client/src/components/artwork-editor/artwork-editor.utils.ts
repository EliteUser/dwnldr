import type { Crop, PixelCrop } from 'react-image-crop';
import { centerCrop, makeAspectCrop } from 'react-image-crop';

import {
  ARTWORK_OUTPUT_SIZE,
  ARTWORK_PREVIEW_QUALITY,
  CROP_VIEWPORT_HEIGHT_RATIO,
  MAX_CROP_HEIGHT,
  MAX_CROP_WIDTH,
} from './artwork-editor.constants';
import type { ImageSize } from './artwork-editor.types';

export const getCenteredSquareCrop = (width: number, height: number): Crop => {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 100,
      },
      1,
      width,
      height,
    ),
    width,
    height,
  );
};

export const getCropAreaSize = (element: HTMLDivElement | null): ImageSize | undefined => {
  if (!element) {
    return undefined;
  }

  const styles = window.getComputedStyle(element);
  const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
  const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);

  const width = Math.min(Math.max(element.clientWidth - horizontalPadding, 0), MAX_CROP_WIDTH);
  const height = Math.min(
    Math.max(element.clientHeight - verticalPadding, 0) || window.innerHeight * CROP_VIEWPORT_HEIGHT_RATIO,
    MAX_CROP_HEIGHT,
  );

  if (!width || !height) {
    return undefined;
  }

  return {
    height,
    width,
  };
};

export const getContainedImageSize = (imageSize: ImageSize, cropArea: ImageSize): ImageSize => {
  const aspectRatio = imageSize.width / imageSize.height;
  let width = cropArea.width;
  let height = width / aspectRatio;

  if (height > cropArea.height) {
    height = cropArea.height;
    width = height * aspectRatio;
  }

  return {
    height,
    width,
  };
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
