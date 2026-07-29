import sharp from 'sharp';

import { ALLOWED_ARTWORK_MIME_TYPES, MAX_ARTWORK_DIMENSION, MAX_ARTWORK_SIZE } from '../artwork/artwork.constants.js';
import { fetchPublicHttpUrl } from '../http/public-http.service.js';
import { cancelResponseBody, readResponseBuffer } from '../http/response-buffer.service.js';

export const saveThumbnailFromUrl = async (url: string, outputPath: string, signal?: AbortSignal) => {
  signal?.throwIfAborted();
  const timeoutSignal = AbortSignal.timeout(15_000);
  const response = await fetchPublicHttpUrl(url, {
    maxRedirects: 3,
    headers: {
      Accept: 'image/jpeg,image/png,image/webp',
    },
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
  });

  if (!response.ok) {
    await cancelResponseBody(response);
    throw new Error('Failed to download thumbnail');
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';

  if (!ALLOWED_ARTWORK_MIME_TYPES.has(mimeType)) {
    await cancelResponseBody(response);
    throw new Error('Thumbnail response was not a supported image');
  }

  const originalBuffer = await readResponseBuffer(response, MAX_ARTWORK_SIZE);
  signal?.throwIfAborted();
  const image = sharp(originalBuffer, {
    failOn: 'error',
    limitInputPixels: MAX_ARTWORK_DIMENSION * MAX_ARTWORK_DIMENSION,
  });
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read thumbnail dimensions');
  }

  if (metadata.width > MAX_ARTWORK_DIMENSION || metadata.height > MAX_ARTWORK_DIMENSION) {
    throw new Error('Thumbnail dimensions exceed the configured limit');
  }

  const side = Math.min(metadata.width, metadata.height);

  signal?.throwIfAborted();
  await image
    .extract({
      left: Math.floor((metadata.width - side) / 2),
      top: Math.floor((metadata.height - side) / 2),
      width: side,
      height: side,
    })
    .resize(512, 512, {
      fit: 'fill',
      withoutEnlargement: true,
    })
    .png()
    .toFile(outputPath);

  return outputPath;
};
