import {
  ACCEPTED_ARTWORK_EXTENSIONS,
  ACCEPTED_ARTWORK_MIME_TYPES,
  MAX_ARTWORK_FILE_SIZE,
  MAX_ARTWORK_IMAGE_SIZE,
  MIN_ARTWORK_IMAGE_SIZE,
} from './artwork.constants';

const ARTWORK_EXTENSION_BY_MIME_TYPE = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

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

export const loadRemoteArtworkFile = async (url: string) => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Enter a valid image URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Artwork URL must start with http:// or https://.');
  }

  let response: Response;

  const params = new URLSearchParams({
    url: parsedUrl.href,
  });

  try {
    response = await fetch(`/api/artwork?${params}`);
  } catch {
    throw new Error('Image URL could not be loaded. Try downloading it and uploading the file instead.');
  }

  if (!response.ok) {
    throw new Error('Image URL could not be loaded.');
  }

  const blob = await response.blob();
  const extension = ARTWORK_EXTENSION_BY_MIME_TYPE.get(blob.type);

  if (!extension) {
    throw new Error('Image URL must return a JPEG, PNG, or WebP image.');
  }

  const file = new File([blob], `artwork.${extension}`, { type: blob.type });

  await validateArtworkFile(file);

  return file;
};
