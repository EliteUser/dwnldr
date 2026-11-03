import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { getLogger } from '../lib/logger.js';

const FOLDER_PREFIX = 'track_';

/** Creates the private working folder for one request. */
export const createDownloadFolder = async () => {
  const folderPath = path.join(env.TEMP_DIR, `${FOLDER_PREFIX}${crypto.randomBytes(4).toString('hex')}`);

  await fs.mkdir(folderPath, { recursive: true });

  return folderPath;
};

/** Removes a request folder. Refuses paths outside TEMP_DIR and never throws. */
export const removeFolder = async (folderPath: string) => {
  const relativePath = path.relative(env.TEMP_DIR, path.resolve(folderPath));

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    getLogger().warn({ evt: 'temp.cleanup.skipped', folderPath }, 'Refused to remove a folder outside the temp root');
    return false;
  }

  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    getLogger().error({ evt: 'temp.cleanup.failed', folderPath, err: error }, 'Failed to remove a temp folder');
    return false;
  }
};

/** Removes request folders left behind by a crash or restart. */
export const removeLeftoverFolders = async () => {
  await fs.mkdir(env.TEMP_DIR, { recursive: true });

  const entries = await fs.readdir(env.TEMP_DIR, { withFileTypes: true });
  const removed = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(FOLDER_PREFIX))
      .map((entry) => removeFolder(path.join(env.TEMP_DIR, entry.name))),
  );

  return removed.filter(Boolean).length;
};
