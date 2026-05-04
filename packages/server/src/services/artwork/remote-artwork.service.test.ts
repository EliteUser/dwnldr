import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_ARTWORK_SIZE } from './artwork.constants.js';
import { fetchRemoteArtwork } from './remote-artwork.service.js';

describe('remote artwork service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches supported image URLs with artwork accept headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          'content-type': 'image/jpeg; charset=utf-8',
          'content-length': '3',
        },
        status: 200,
      }),
    );

    const artwork = await fetchRemoteArtwork('https://img.example.test/cover.jpg');

    expect(artwork).toEqual({
      buffer: Buffer.from([1, 2, 3]),
      mimeType: 'image/jpeg',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://img.example.test/cover.jpg',
      expect.objectContaining({
        headers: {
          Accept: 'image/jpeg,image/png,image/webp',
        },
      }),
    );
  });

  it('rejects responses that are not artwork images', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('nope', {
        headers: {
          'content-type': 'text/html',
        },
        status: 200,
      }),
    );

    await expect(fetchRemoteArtwork('https://img.example.test/cover')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Image URL must return a JPEG, PNG, or WebP image.',
    });
  });

  it('rejects artwork streams once they exceed the maximum size', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(new Uint8Array(MAX_ARTWORK_SIZE + 1), {
        headers: {
          'content-type': 'image/png',
        },
        status: 200,
      }),
    );

    await expect(fetchRemoteArtwork('https://img.example.test/huge.png')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Artwork must be 8 MB or smaller.',
    });
  });
});
