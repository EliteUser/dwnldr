import path from 'node:path';

import { HttpError } from '../../errors/http-error.js';

export const getArtworkExtension = (name: string) => path.extname(name).toLowerCase();

export const throwInvalidArtwork = (message: string, details?: Record<string, unknown>): never => {
  throw new HttpError(400, message, {
    code: 'INVALID_INPUT',
    details,
  });
};
