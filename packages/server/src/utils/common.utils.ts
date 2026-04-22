import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const getId = () => crypto.randomBytes(16).toString('hex').slice(0, 8);

export const getExtension = (name: string) => path.extname(name).replace('.', '').toLowerCase();

export const removeFolder = (folder: string) => {
  if (fs.existsSync(folder)) {
    fs.rmSync(folder, { recursive: true, force: true });
  }
};

export const renameFile = async (currentPath: string, newPath: string) => {
  try {
    await fs.promises.rename(currentPath, newPath);
  } catch (error) {
    console.error(`Error renaming file: ${currentPath}`, error);
  }
};

export const isYoutubeLink = (url: string) => url.includes('youtube') || url.includes('youtu.be');
