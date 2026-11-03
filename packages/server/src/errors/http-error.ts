import type { ApiErrorCode } from '@dwnldr/shared';

export class HttpError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, options: { code: ApiErrorCode; details?: unknown }) {
    super(message);

    this.name = 'HttpError';
    this.code = options.code;
    this.statusCode = statusCode;
    this.details = options.details;
  }
}
