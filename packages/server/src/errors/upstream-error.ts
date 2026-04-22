import { HttpError } from './http-error.js';

export const SOUNDCLOUD_UNAUTHORIZED_MESSAGE =
  'SoundCloud rejected the request. The embedded client_id may be expired - restart the server to pick up a new one.';

export const YOUTUBE_UPSTREAM_MESSAGE = 'YouTube did not respond. Try again later.';
export const SOUNDCLOUD_UPSTREAM_MESSAGE = 'SoundCloud did not respond. Try again later.';

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };

  const status = candidate.statusCode ?? candidate.status ?? candidate.response?.status;

  return typeof status === 'number' ? status : undefined;
};

export const isEnospcError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOSPC';

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

type SoundCloudErrorOptions = {
  notFoundMessage?: string;
  fallbackMessage?: string;
};

export const toSoundCloudHttpError = (error: unknown, options: SoundCloudErrorOptions = {}) => {
  if (error instanceof HttpError) {
    return error;
  }

  const status = getErrorStatus(error);

  if (status === 401 || status === 403) {
    return new HttpError(502, SOUNDCLOUD_UNAUTHORIZED_MESSAGE, {
      code: 'UPSTREAM_UNAUTHORIZED',
    });
  }

  if (status === 404 && options.notFoundMessage) {
    return new HttpError(404, options.notFoundMessage, {
      code: 'INVALID_INPUT',
    });
  }

  return new HttpError(502, options.fallbackMessage ?? SOUNDCLOUD_UPSTREAM_MESSAGE, {
    code: 'UPSTREAM_FAILURE',
  });
};

export const toYouTubeHttpError = (error: unknown, message: string = YOUTUBE_UPSTREAM_MESSAGE) => {
  if (error instanceof HttpError) {
    return error;
  }

  return new HttpError(502, message, {
    code: 'UPSTREAM_FAILURE',
  });
};
