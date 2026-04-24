import { getErrorStatus } from './error-utils.js';
import { HttpError } from './http-error.js';

export const SOUNDCLOUD_UNAUTHORIZED_MESSAGE =
  'SoundCloud rejected the request. The embedded client_id may be expired - restart the server to pick up a new one.';

export const SOUNDCLOUD_UPSTREAM_MESSAGE = 'SoundCloud did not respond. Try again later.';

type SoundCloudErrorOptions = {
  fallbackMessage?: string;
  notFoundMessage?: string;
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
