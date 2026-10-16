import { notifications } from '@mantine/notifications';
import { useMemo } from 'react';

import type { ApiErrorResponse } from '../../api/api.errors';
import { REQUEST_FAILED_MESSAGE } from '../../api/api.errors';
import { API_ERROR_MESSAGE } from './notify.constants';

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
    case 'RATE_LIMITED':
      return API_ERROR_MESSAGE.RATE_LIMITED;
    case 'SERVER_BUSY':
      return API_ERROR_MESSAGE.SERVER_BUSY;
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

const createNotifier = () => {
  const showToast = (color: 'blue' | 'green' | 'red', message: string, options?: NotifyOptions) => {
    const notification = {
      id: getToastName(options?.name),
      title: options?.title,
      message,
      color,
      autoClose: options?.autoClose ?? 4000,
      closeButtonProps: { 'aria-label': 'Dismiss notification' },
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
