export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_SOURCE'
  | 'YOUTUBE_PLAYLIST'
  | 'UPSTREAM_UNAUTHORIZED'
  | 'UPSTREAM_FAILURE'
  | 'CONVERSION_FAILURE'
  | 'RATE_LIMITED'
  | 'SERVER_BUSY'
  | 'INTERNAL_ERROR';

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
