import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_ARTWORK_DIMENSION, MAX_ARTWORK_SIZE } from '../artwork/artwork.constants.js';

const fetchPublicHttpUrlMock = vi.fn();

vi.mock('../http/public-http.service.js', () => ({
  fetchPublicHttpUrl: fetchPublicHttpUrlMock,
}));

const { saveThumbnailFromUrl } = await import('./thumbnail.service.js');

describe('saveThumbnailFromUrl', () => {
  let testFolder: string;

  beforeEach(async () => {
    fetchPublicHttpUrlMock.mockReset();
    testFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-thumbnail-'));
  });

  afterEach(async () => {
    await fs.rm(testFolder, { force: true, recursive: true });
  });

  it('downloads a valid image through the pinned public HTTP transport', async () => {
    const image = await sharp({
      create: {
        width: 256,
        height: 128,
        channels: 3,
        background: '#123456',
      },
    })
      .png()
      .toBuffer();
    fetchPublicHttpUrlMock.mockResolvedValue(
      new Response(image, {
        headers: {
          'content-type': 'image/png',
        },
      }),
    );
    const outputPath = path.join(testFolder, 'cover.png');

    await expect(saveThumbnailFromUrl('https://cdn.example.test/cover.png', outputPath)).resolves.toBe(outputPath);
    expect((await fs.stat(outputPath)).isFile()).toBe(true);
    expect(fetchPublicHttpUrlMock).toHaveBeenCalledWith(
      'https://cdn.example.test/cover.png',
      expect.objectContaining({
        headers: {
          Accept: 'image/jpeg,image/png,image/webp',
        },
        maxRedirects: 3,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('rejects unsupported response types before decoding', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    fetchPublicHttpUrlMock.mockResolvedValue({
      body: {
        cancel,
      },
      headers: new Headers({
        'content-type': 'text/html',
      }),
      ok: true,
    } as unknown as Response);

    await expect(
      saveThumbnailFromUrl('https://cdn.example.test/cover', path.join(testFolder, 'cover.png')),
    ).rejects.toThrow('supported image');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects responses whose declared size exceeds the limit', async () => {
    fetchPublicHttpUrlMock.mockResolvedValue(
      new Response(new Uint8Array([1]), {
        headers: {
          'content-length': String(MAX_ARTWORK_SIZE + 1),
          'content-type': 'image/png',
        },
      }),
    );

    await expect(
      saveThumbnailFromUrl('https://cdn.example.test/large.png', path.join(testFolder, 'cover.png')),
    ).rejects.toThrow('size limit');
  });

  it('rejects decoded dimensions above the configured limit', async () => {
    const image = await sharp({
      create: {
        width: MAX_ARTWORK_DIMENSION + 1,
        height: 1,
        channels: 3,
        background: '#123456',
      },
    })
      .png()
      .toBuffer();
    fetchPublicHttpUrlMock.mockResolvedValue(
      new Response(image, {
        headers: {
          'content-type': 'image/png',
        },
      }),
    );

    await expect(
      saveThumbnailFromUrl('https://cdn.example.test/wide.png', path.join(testFolder, 'cover.png')),
    ).rejects.toThrow('dimensions');
  });
});
