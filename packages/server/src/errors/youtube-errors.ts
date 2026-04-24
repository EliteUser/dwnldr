import { getErrorMessage } from './error-utils.js';
import { HttpError } from './http-error.js';

export const YOUTUBE_UPSTREAM_MESSAGE = 'YouTube did not respond. Try again later.';

export const isYtDlpSignatureError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('signature extraction failed') ||
    message.includes('could not extract') ||
    message.includes('nsig extraction failed')
  );
};

export const isYtDlpSpawnError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as NodeJS.ErrnoException;
  const message = getErrorMessage(error).toLowerCase();

  return candidate.code === 'ENOENT' || message.includes('spawn');
};

export const toYouTubeHttpError = (error: unknown, message: string = YOUTUBE_UPSTREAM_MESSAGE) => {
  if (error instanceof HttpError) {
    return error;
  }

  return new HttpError(502, message, {
    code: 'UPSTREAM_FAILURE',
  });
};
