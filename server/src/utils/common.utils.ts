import fs from 'node:fs';
import crypto from 'node:crypto';

export const getId = () => {
    return crypto.randomBytes(16).toString('hex').slice(0, 8);
};

export const getExtension = (name: string) => name.split('.').pop();

export const removeFolder = (folder: string) => {
    if (fs.existsSync(folder)) {
        fs.rmSync(folder, { recursive: true });
    }
};

export const renameFile = async (path: string, newPath: string) => {
    try {
        await fs.promises.rename(path, newPath);
    } catch (err) {
        console.error(`Error renaming file: ${path}`, err);
    }
};
