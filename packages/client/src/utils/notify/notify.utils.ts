import { notifications } from '@mantine/notifications';
import { useMemo } from 'react';

import { API_ERROR_MESSAGE, REQUEST_FAILED_MESSAGE } from './notify.constants';

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_SOURCE'
  | 'YOUTUBE_PLAYLIST'
  | 'UPSTREAM_UNAUTHORIZED'
  | 'UPSTREAM_FAILURE'
  | 'CONVERSION_FAILURE'
  | 'INTERNAL_ERROR';

export type ApiErrorResponse = {
  code?: ApiErrorCode | string;
  details?: unknown;
  error?: string;
};

type NotifyOptions = {
  autoClose?: false | number;
  loading?: boolean;
  name?: string;
  title?: string;
  update?: boolean;
  withCloseButton?: boolean;
};

let toastId = 0;

const getToastName = (name?: string) => {
  if (name) {
    return name;
  }

  toastId += 1;
  return `toast-${toastId}`;
};

export const getApiErrorMessage = (error?: ApiErrorResponse | null) => {
  switch (error?.code) {
    case 'UNSUPPORTED_SOURCE':
      return API_ERROR_MESSAGE.UNSUPPORTED_SOURCE;
    case 'YOUTUBE_PLAYLIST':
      return API_ERROR_MESSAGE.YOUTUBE_PLAYLIST;
    case 'UPSTREAM_UNAUTHORIZED':
      return API_ERROR_MESSAGE.UPSTREAM_UNAUTHORIZED;
    case 'UPSTREAM_FAILURE':
      return API_ERROR_MESSAGE.UPSTREAM_FAILURE;
    case 'CONVERSION_FAILURE':
      return API_ERROR_MESSAGE.CONVERSION_FAILURE;
    case 'INVALID_INPUT':
      return error.error || API_ERROR_MESSAGE.INVALID_INPUT;
    case 'INTERNAL_ERROR':
    default:
      return API_ERROR_MESSAGE.INTERNAL_ERROR;
  }
};

export const getApiErrorFromQueryError = (error?: unknown): ApiErrorResponse | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    return (error as { response: ApiErrorResponse }).response;
  }

  return {
    code: 'INTERNAL_ERROR',
    error: error instanceof Error ? error.message : REQUEST_FAILED_MESSAGE,
  };
};

export const parseApiErrorResponse = async (response: Response): Promise<ApiErrorResponse> => {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return {
      code: 'INTERNAL_ERROR',
      error: response.statusText || REQUEST_FAILED_MESSAGE,
    };
  }
};

const createNotifier = () => {
  const showToast = (color: 'blue' | 'green' | 'red', message: string, options?: NotifyOptions) => {
    const notification = {
      id: getToastName(options?.name),
      title: options?.title,
      message,
      color,
      autoClose: options?.autoClose ?? 4000,
      loading: options?.loading ?? false,
      withCloseButton: options?.withCloseButton ?? true,
    };

    if (options?.update) {
      notifications.update(notification);
      return;
    }

    notifications.show(notification);
  };

  return {
    error: (message: string, options?: NotifyOptions) => showToast('red', message, options),
    info: (message: string, options?: NotifyOptions) => showToast('blue', message, options),
    success: (message: string, options?: NotifyOptions) => showToast('green', message, options),
    apiError: (error?: ApiErrorResponse | null, options?: NotifyOptions) =>
      showToast('red', getApiErrorMessage(error), options),
  };
};

export const notify = createNotifier();

export const useNotify = () => {
  return useMemo(() => createNotifier(), []);
};
