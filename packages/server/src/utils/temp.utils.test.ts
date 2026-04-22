import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { env } from '../config/env.js';
import { removeFolder, sweepStaleDownloadFolders } from './temp.utils.js';

const createdPaths: string[] = [];

const createDirectory = async (folderName: string) => {
  const directoryPath = path.join(env.TEMP_DIR, folderName);
  await fs.mkdir(directoryPath, { recursive: true });
  createdPaths.push(directoryPath);
  return directoryPath;
};

afterEach(async () => {
  await Promise.all(
    createdPaths.splice(0).map((directoryPath) => fs.rm(directoryPath, { recursive: true, force: true })),
  );
});

describe('removeFolder', () => {
  it('does not remove directories outside the temp root', async () => {
    const outsideDirectory = path.resolve(env.TEMP_DIR, '..', 'outside-temp-root');
    await fs.mkdir(outsideDirectory, { recursive: true });
    createdPaths.push(outsideDirectory);

    expect(removeFolder(outsideDirectory)).toBe(false);
    await expect(fs.stat(outsideDirectory)).resolves.toBeDefined();
  });
});

describe('sweepStaleDownloadFolders', () => {
  it('removes only stale download folders inside the temp root', async () => {
    const staleDirectory = await createDirectory('track_stale-test');
    const freshDirectory = await createDirectory('track_fresh-test');
    const nonDownloadDirectory = await createDirectory('keep-me');
    const staleDate = new Date(Date.now() - 31 * 60 * 1000);

    await fs.utimes(staleDirectory, staleDate, staleDate);

    expect(await sweepStaleDownloadFolders(30 * 60 * 1000)).toBe(1);

    await expect(fs.stat(staleDirectory)).rejects.toThrow();
    await expect(fs.stat(freshDirectory)).resolves.toBeDefined();
    await expect(fs.stat(nonDownloadDirectory)).resolves.toBeDefined();
  });
});
