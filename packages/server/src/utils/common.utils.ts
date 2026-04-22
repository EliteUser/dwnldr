import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type Source = 'youtube' | 'soundcloud';

export const getId = () => crypto.randomBytes(16).toString('hex').slice(0, 8);

export const getExtension = (name: string) => path.extname(name).replace('.', '').toLowerCase();

export const removeFolder = (folder: string) => {
  if (fs.existsSync(folder)) {
    fs.rmSync(folder, { recursive: true, force: true });
  }
};

export const renameFile = async (currentPath: string, newPath: string) => {
  await fs.promises.rename(currentPath, newPath);
};

export const classifySource = (url: string): Source | null => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      return 'youtube';
    }

    if (hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com')) {
      return 'soundcloud';
    }
  } catch {
    return null;
  }

  return null;
};
