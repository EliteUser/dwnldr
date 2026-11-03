import NodeID3 from 'node-id3';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { finalizeTrack, readTags } from './track-pipeline.js';

let folder: string;

const createImage = (filePath: string, width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#ff5500' } })
    .jpeg()
    .toFile(filePath);

beforeEach(async () => {
  folder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-pipeline-'));
  await fs.writeFile(path.join(folder, 'source.mp3'), Buffer.alloc(256));
});

afterEach(async () => {
  await fs.rm(folder, { recursive: true, force: true });
});

describe('finalizeTrack', () => {
  it('writes tags, a square cover, and renames the file after the track name', async () => {
    const artworkPath = path.join(folder, 'thumbnail.jpg');
    await createImage(artworkPath, 640, 360);

    const filePath = await finalizeTrack({
      artworkPath,
      audioPath: path.join(folder, 'source.mp3'),
      folder,
      tags: { name: 'Artist - Title - Remix', lyrics: 'La la' },
    });

    expect(filePath).toBe(path.join(folder, 'Artist - Title - Remix.mp3'));

    const tags = await NodeID3.Promise.read(filePath);
    const image = tags.image as NodeID3.Tags['image'] & { imageBuffer: Buffer };

    expect(tags).toMatchObject({ artist: 'Artist', title: 'Title - Remix', album: 'Music' });
    expect(tags.performerInfo).toMatch(/^[0-9a-f]{8}$/);
    expect(tags.unsynchronisedLyrics?.text).toBe('La la');
    expect(await sharp(image.imageBuffer).metadata()).toMatchObject({ width: 360, height: 360, format: 'png' });
  });

  it('keeps the existing cover and finishes without one when the artwork is unreadable', async () => {
    const artworkPath = path.join(folder, 'thumbnail.jpg');
    await fs.writeFile(artworkPath, 'not an image');

    const filePath = await finalizeTrack({
      artworkPath,
      audioPath: path.join(folder, 'source.mp3'),
      folder,
      tags: { name: 'Solo', album: 'Album' },
    });

    expect(await NodeID3.Promise.read(filePath)).toMatchObject({ artist: 'Solo', title: 'Solo', album: 'Album' });
  });
});

describe('readTags', () => {
  it('falls back to the file name when the MP3 has no tags', async () => {
    await expect(readTags(path.join(folder, 'source.mp3'), 'My File')).resolves.toEqual({
      album: '',
      artwork: null,
      lyrics: '',
      name: 'My File',
    });
  });
});
