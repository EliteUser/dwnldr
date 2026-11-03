import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '../config/env.js';
import { createDownloadFolder, removeFolder, removeLeftoverFolders } from './temp.utils.js';

const createdPaths: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(createdPaths.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('removeFolder', () => {
  it('does not remove directories outside the temp root', async () => {
    const outsideDirectory = path.resolve(env.TEMP_DIR, '..', 'outside-temp-root');
    await fs.mkdir(outsideDirectory, { recursive: true });
    createdPaths.push(outsideDirectory);

    expect(await removeFolder(outsideDirectory)).toBe(false);
    expect(await removeFolder(env.TEMP_DIR)).toBe(false);
    await expect(fs.stat(outsideDirectory)).resolves.toBeDefined();
  });

  it('reports cleanup failures without throwing', async () => {
    const directory = await createDownloadFolder();
    createdPaths.push(directory);
    vi.spyOn(fs, 'rm').mockRejectedValueOnce(new Error('file is locked'));

    expect(await removeFolder(directory)).toBe(false);
  });
});

describe('removeLeftoverFolders', () => {
  it('removes request folders and keeps everything else', async () => {
    const leftover = await createDownloadFolder();
    const other = path.join(env.TEMP_DIR, 'keep-me');
    await fs.mkdir(other, { recursive: true });
    createdPaths.push(leftover, other);

    expect(await removeLeftoverFolders()).toBeGreaterThanOrEqual(1);
    await expect(fs.stat(leftover)).rejects.toThrow();
    await expect(fs.stat(other)).resolves.toBeDefined();
  });
});
