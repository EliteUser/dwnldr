import type { ApiErrorCode } from '@dwnldr/shared';
import { notifications } from '@mantine/notifications';

import { ApiRequestError } from '../api';

const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

const API_ERROR_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  UNSUPPORTED_SOURCE: 'This link is not supported.',
  PLAYLIST_NOT_SUPPORTED: 'Playlists are not supported - paste a link to a single track.',
  UPSTREAM_UNAUTHORIZED: 'Could not access this source right now. Try again later.',
  UPSTREAM_FAILURE: 'Could not reach this source right now. Try again later.',
  RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
  SERVER_BUSY: 'Another download is already running. Try again shortly.',
};

/** User-facing text for a failed request. Server text is shown only for input errors, which are written for users. */
export const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiRequestError)) {
    return FALLBACK_MESSAGE;
  }

  const { code, error: message } = error.response;

  if (code === 'INVALID_INPUT' || code === 'NOT_FOUND') {
    return message || FALLBACK_MESSAGE;
  }

  return API_ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE;
};

const show = (color: string, message: string) => {
  notifications.show({ color, message, autoClose: 4000 });
};

export const notify = {
  error: (message: string) => show('red', message),
  info: (message: string) => show('blue', message),
  success: (message: string) => show('green', message),
  apiError: (error: unknown) => show('red', getApiErrorMessage(error)),
  /** Shows a spinner notification that `finish` later replaces. */
  progress: (id: string, message: string) =>
    notifications.show({ id, message, loading: true, autoClose: false, withCloseButton: false }),
  finish: (id: string, color: string, message: string) =>
    notifications.update({ id, color, message, loading: false, autoClose: 4000, withCloseButton: true }),
};
