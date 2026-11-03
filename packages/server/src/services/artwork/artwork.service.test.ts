import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertArtworkFile } from './artwork.service.js';

let tempFolder: string;

const writeFile = async (name: string, content: Buffer | string) => {
  const filePath = path.join(tempFolder, name);
  await fs.writeFile(filePath, content);
  return { path: filePath, size: Buffer.byteLength(content) };
};

const createImage = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#ff5500' } })
    .png()
    .toBuffer();

describe('assertArtworkFile', () => {
  beforeEach(async () => {
    tempFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-artwork-'));
  });

  afterEach(async () => {
    await fs.rm(tempFolder, { force: true, recursive: true });
  });

  it('accepts a decodable image within the size limits', async () => {
    await expect(assertArtworkFile(await writeFile('artwork', await createImage(512, 256)))).resolves.toBeUndefined();
  });

  it.each([
    ['files that are not images', () => 'not an image', 'Artwork image could not be decoded.'],
    ['images below 128 px', () => createImage(64, 64), 'Artwork must be at least 128 x 128 pixels.'],
  ])('rejects %s', async (_label, createContent, message) => {
    await expect(assertArtworkFile(await writeFile('artwork', await createContent()))).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message,
    });
  });

  it('rejects files over 8 MB before decoding them', async () => {
    const file = await writeFile('artwork', await createImage(512, 512));

    await expect(assertArtworkFile({ ...file, size: 9 * 1024 * 1024 })).rejects.toMatchObject({
      message: 'Artwork must be 8 MB or smaller.',
    });
  });
});
