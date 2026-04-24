import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const getId = () => crypto.randomBytes(16).toString('hex').slice(0, 8);

export const getExtension = (name: string) => path.extname(name).replace('.', '').toLowerCase();

export const renameFile = async (currentPath: string, newPath: string) => {
  await fs.promises.rename(currentPath, newPath);
};
