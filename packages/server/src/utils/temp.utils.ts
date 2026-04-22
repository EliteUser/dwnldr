import fs from 'node:fs';
import path from 'node:path';

import { env } from '../config/env.js';
import { getLogger } from '../lib/logger.js';
import { getId } from './common.utils.js';

const DOWNLOAD_FOLDER_PREFIX = 'track_';

const resolveWithinTempRoot = (targetPath: string) => {
  const tempRoot = path.resolve(env.TEMP_DIR);
  const resolvedTargetPath = path.resolve(targetPath);
  const relativePath = path.relative(tempRoot, resolvedTargetPath);
  const isInsideTempRoot = relativePath !== '' && !relativePath.startsWith('..');

  return {
    isInsideTempRoot,
    resolvedTargetPath,
    tempRoot,
  };
};

export const ensureTempRoot = async () => {
  await fs.promises.mkdir(env.TEMP_DIR, { recursive: true });
};

export const createDownloadFolder = async () => {
  await ensureTempRoot();

  const folderPath = path.join(env.TEMP_DIR, `${DOWNLOAD_FOLDER_PREFIX}${getId()}`);

  await fs.promises.mkdir(folderPath, { recursive: true });

  return folderPath;
};

export const removeFolder = (folderPath: string) => {
  const { isInsideTempRoot, resolvedTargetPath, tempRoot } = resolveWithinTempRoot(folderPath);

  if (!isInsideTempRoot) {
    getLogger({
      folderPath: resolvedTargetPath,
      tempRoot,
    }).warn(
      {
        evt: 'download.cleanup.skipped',
      },
      'Skipped cleanup for folder outside the temp root',
    );

    return false;
  }

  if (!fs.existsSync(resolvedTargetPath)) {
    return false;
  }

  fs.rmSync(resolvedTargetPath, { recursive: true, force: true });
  return true;
};

export const sweepStaleDownloadFolders = async (maxAgeMs: number) => {
  await ensureTempRoot();

  const entries = await fs.promises.readdir(env.TEMP_DIR, {
    withFileTypes: true,
  });
  const cutoffTime = Date.now() - maxAgeMs;
  let removedCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(DOWNLOAD_FOLDER_PREFIX)) {
      continue;
    }

    const folderPath = path.join(env.TEMP_DIR, entry.name);
    const stats = await fs.promises.stat(folderPath);

    if (stats.mtimeMs > cutoffTime) {
      continue;
    }

    if (removeFolder(folderPath)) {
      removedCount += 1;
    }
  }

  return removedCount;
};
