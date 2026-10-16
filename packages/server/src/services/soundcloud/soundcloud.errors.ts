import { getErrorStatus } from '../../errors/error-utils.js';
import { HttpError } from '../../errors/http-error.js';

export const SOUNDCLOUD_UPSTREAM_MESSAGE = 'SoundCloud did not respond. Try again later.';

export const toSoundCloudHttpError = (error: unknown, notFoundMessage?: string) => {
  if (error instanceof HttpError) {
    return error;
  }

  const status = getErrorStatus(error);

  if (status === 401 || status === 403) {
    return new HttpError(502, SOUNDCLOUD_UPSTREAM_MESSAGE, {
      code: 'UPSTREAM_UNAUTHORIZED',
    });
  }

  if (status === 404 && notFoundMessage) {
    return new HttpError(404, notFoundMessage, {
      code: 'INVALID_INPUT',
    });
  }

  return new HttpError(502, SOUNDCLOUD_UPSTREAM_MESSAGE, {
    code: 'UPSTREAM_FAILURE',
  });
};
