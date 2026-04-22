import type { ToastTheme, ToasterPublicMethods } from '@gravity-ui/uikit';
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { useToaster } from '@gravity-ui/uikit';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
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
  name?: string;
  title?: string;
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
      return error.error ?? API_ERROR_MESSAGE.INVALID_INPUT;
    case 'INTERNAL_ERROR':
    default:
      return error?.error ?? API_ERROR_MESSAGE.INTERNAL_ERROR;
  }
};

export const getApiErrorFromRtkError = (
  error?: FetchBaseQueryError | SerializedError | null,
): ApiErrorResponse | null => {
  if (!error) {
    return null;
  }

  if ('status' in error) {
    if (typeof error.data === 'object' && error.data !== null) {
      return error.data as ApiErrorResponse;
    }

    return {
      code: 'INTERNAL_ERROR',
      error: 'error' in error && typeof error.error === 'string' ? error.error : REQUEST_FAILED_MESSAGE,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    error: error.message,
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

const createNotifier = (api: ToasterPublicMethods) => {
  const showToast = (theme: ToastTheme, message: string, options?: NotifyOptions) => {
    api.add({
      name: getToastName(options?.name),
      title: options?.title ?? message,
      theme,
      autoHiding: 4000,
      isClosable: true,
    });
  };

  return {
    error: (message: string, options?: NotifyOptions) => showToast('danger', message, options),
    info: (message: string, options?: NotifyOptions) => showToast('info', message, options),
    success: (message: string, options?: NotifyOptions) => showToast('success', message, options),
    apiError: (error?: ApiErrorResponse | null, options?: NotifyOptions) =>
      showToast('danger', getApiErrorMessage(error), options),
  };
};

export const notify = createNotifier(toaster);

export const useNotify = () => {
  const toasterApi = useToaster();

  return useMemo(() => createNotifier(toasterApi), [toasterApi]);
};
