import type { ApiErrorCode } from '@dwnldr/shared';

export type { ApiErrorCode };

export type ApiErrorResponse = {
  code?: ApiErrorCode | string;
  details?: unknown;
  error?: string;
};

export const REQUEST_FAILED_MESSAGE = 'The request failed. Try again.';

export class ApiRequestError extends Error {
  response: ApiErrorResponse;
  status: number;

  constructor(response: ApiErrorResponse, status: number) {
    super(response.error || 'Request failed');
    this.name = 'ApiRequestError';
    this.response = response;
    this.status = status;
  }
}

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
