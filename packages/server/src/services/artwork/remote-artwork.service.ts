import { HttpError } from '../../errors/http-error.js';
import { logTimedOperation } from '../../lib/logger.js';
import { ALLOWED_ARTWORK_MIME_TYPES, MAX_ARTWORK_SIZE } from './artwork.constants.js';

export type RemoteArtwork = {
  buffer: Buffer;
  mimeType: string;
};

const REQUEST_TIMEOUT_MS = 15_000;

const getMimeType = (contentType: string | null) => contentType?.split(';')[0]?.trim().toLowerCase() ?? '';

const getArtworkTooLargeError = () =>
  new HttpError(400, 'Artwork must be 8 MB or smaller.', {
    code: 'INVALID_INPUT',
    details: {
      maxSize: MAX_ARTWORK_SIZE,
    },
  });

const readArtworkBuffer = async (response: Response) => {
  if (!response.body) {
    return Buffer.from(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return Buffer.concat(chunks, size);
      }

      size += value.byteLength;

      if (size > MAX_ARTWORK_SIZE) {
        await reader.cancel().catch(() => undefined);
        throw getArtworkTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
};

export const fetchRemoteArtwork = async (url: string): Promise<RemoteArtwork> =>
  await logTimedOperation(
    {
      startEvt: 'artwork.remote.fetch.started',
      successEvt: 'artwork.remote.fetch.completed',
      failureEvt: 'artwork.remote.fetch.failed',
      startMessage: 'Fetching remote artwork',
      successMessage: 'Fetched remote artwork',
      failureMessage: 'Failed to fetch remote artwork',
      failureLevel: 'warn',
      bindings: {
        url,
      },
      getSuccessBindings: (artwork) => ({
        mimeType: artwork.mimeType,
        size: artwork.buffer.length,
      }),
    },
    async () => {
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(url);
      } catch {
        throw new HttpError(400, 'Enter a valid image URL.', {
          code: 'INVALID_INPUT',
        });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new HttpError(400, 'Artwork URL must start with http:// or https://.', {
          code: 'INVALID_INPUT',
        });
      }

      let response: Response;

      try {
        response = await fetch(parsedUrl.href, {
          headers: {
            Accept: 'image/jpeg,image/png,image/webp',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new HttpError(400, 'Image URL could not be loaded.', {
          code: 'INVALID_INPUT',
        });
      }

      if (!response.ok) {
        throw new HttpError(400, 'Image URL could not be loaded.', {
          code: 'INVALID_INPUT',
          details: {
            status: response.status,
          },
        });
      }

      const mimeType = getMimeType(response.headers.get('content-type'));

      if (!ALLOWED_ARTWORK_MIME_TYPES.has(mimeType)) {
        throw new HttpError(400, 'Image URL must return a JPEG, PNG, or WebP image.', {
          code: 'INVALID_INPUT',
          details: {
            mimeType,
          },
        });
      }

      const contentLength = Number(response.headers.get('content-length'));

      if (Number.isFinite(contentLength) && contentLength > MAX_ARTWORK_SIZE) {
        throw getArtworkTooLargeError();
      }

      const buffer = await readArtworkBuffer(response);

      return {
        buffer,
        mimeType,
      };
    },
  );
