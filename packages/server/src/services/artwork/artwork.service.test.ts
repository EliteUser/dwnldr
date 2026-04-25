import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HttpError } from '../../errors/http-error.js';
import { assertUploadedArtwork, saveNormalizedArtwork } from './artwork.service.js';

let tempFolder: string;

const createArtwork = async (width = 512, height = 256) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#ff5500',
    },
  })
    .png()
    .toBuffer();

describe('artwork service', () => {
  beforeEach(async () => {
    tempFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-artwork-'));
  });

  afterEach(async () => {
    await fs.rm(tempFolder, {
      force: true,
      recursive: true,
    });
  });

  it('rejects artwork with an unsupported MIME type', async () => {
    await expect(
      assertUploadedArtwork({
        buffer: await createArtwork(),
        mimeType: 'text/plain',
        originalName: 'cover.txt',
        size: 128,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    } satisfies Partial<HttpError>);
  });

  it('rejects artwork that cannot be decoded', async () => {
    await expect(
      assertUploadedArtwork({
        buffer: Buffer.from('not an image'),
        mimeType: 'image/png',
        originalName: 'cover.png',
        size: 12,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    } satisfies Partial<HttpError>);
  });

  it('normalizes valid artwork to a square PNG', async () => {
    const outputPath = await saveNormalizedArtwork(
      {
        buffer: await createArtwork(),
        mimeType: 'image/png',
        originalName: 'cover.png',
        size: 128,
      },
      tempFolder,
    );

    const metadata = await sharp(outputPath).metadata();

    expect(outputPath).toBe(path.join(tempFolder, 'custom-artwork.png'));
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1024);
  });
});
