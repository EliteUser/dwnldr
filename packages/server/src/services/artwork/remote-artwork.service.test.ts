import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_ARTWORK_SIZE } from './artwork.constants.js';

const fetchPublicHttpUrlMock = vi.fn();

vi.mock('../http/public-http.service.js', () => ({
  fetchPublicHttpUrl: fetchPublicHttpUrlMock,
}));

const { fetchRemoteArtwork } = await import('./remote-artwork.service.js');

describe('remote artwork service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches supported image URLs with artwork accept headers', async () => {
    fetchPublicHttpUrlMock.mockResolvedValueOnce(
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
    expect(fetchPublicHttpUrlMock).toHaveBeenCalledWith(
      new URL('https://img.example.test/cover.jpg'),
      expect.objectContaining({
        headers: {
          Accept: 'image/jpeg,image/png,image/webp',
        },
      }),
    );
  });

  it('rejects responses that are not artwork images', async () => {
    fetchPublicHttpUrlMock.mockResolvedValueOnce(
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

  it('cancels rejected upstream responses', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    fetchPublicHttpUrlMock.mockResolvedValueOnce({
      body: {
        cancel,
      },
      headers: new Headers(),
      ok: false,
      status: 404,
    } as unknown as Response);

    await expect(fetchRemoteArtwork('https://img.example.test/missing')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects artwork streams once they exceed the maximum size', async () => {
    fetchPublicHttpUrlMock.mockResolvedValueOnce(
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
