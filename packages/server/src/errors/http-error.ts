export const HTTP_ERROR_CODES = [
  'INVALID_INPUT',
  'UNSUPPORTED_SOURCE',
  'YOUTUBE_PLAYLIST',
  'UPSTREAM_UNAUTHORIZED',
  'UPSTREAM_FAILURE',
  'CONVERSION_FAILURE',
  'INTERNAL_ERROR',
] as const;

export type HttpErrorCode = (typeof HTTP_ERROR_CODES)[number];

export class HttpError extends Error {
  public readonly code: HttpErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, options: { code: HttpErrorCode; details?: unknown }) {
    super(message);

    this.name = 'HttpError';
    this.code = options.code;
    this.statusCode = statusCode;
    this.details = options.details;
  }
}
