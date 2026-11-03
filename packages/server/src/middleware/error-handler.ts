import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

import { getErrorStatus, HttpError, isAbortError } from '../errors.js';
import { getLogger } from '../lib/logger.js';
import { removeFolder } from '../utils/temp.utils.js';

/** Maps expected client-side failures (validation, uploads, body parsing) to an HttpError. */
const toHttpError = (error: unknown) => {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new HttpError(400, 'Invalid request', { code: 'INVALID_INPUT', details: error.flatten() });
  }

  if (error instanceof multer.MulterError) {
    const isTooLarge = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE', 'LIMIT_FIELD_KEY'].includes(error.code);

    return new HttpError(isTooLarge ? 413 : 400, isTooLarge ? 'Uploaded content is too large.' : 'Invalid upload.', {
      code: 'INVALID_INPUT',
    });
  }

  // express.json() errors carry a 4xx status and a `type` such as "entity.parse.failed".
  const status = getErrorStatus(error);

  if (status && status >= 400 && status < 500 && (error as { type?: unknown }).type) {
    return new HttpError(status, status === 413 ? 'Request body is too large.' : 'Invalid request body.', {
      code: 'INVALID_INPUT',
    });
  }

  return undefined;
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const logger = getLogger();

  // Requests can fail during upload, before their handler gets a chance to clean up.
  if (res.locals.folder) {
    void removeFolder(res.locals.folder);
  }

  // The request logger already records client disconnects as http.request.aborted.
  if (isAbortError(error)) {
    res.end();
    return;
  }

  if (res.headersSent) {
    logger.warn({ evt: 'response.failed', err: error }, 'Response failed after headers were sent');
    res.end();
    return;
  }

  const httpError = toHttpError(error);

  if (!httpError) {
    logger.error({ evt: 'request.failed.unhandled', err: error }, 'Unhandled server error');
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    return;
  }

  logger.warn(
    { evt: 'request.failed', statusCode: httpError.statusCode, code: httpError.code, details: httpError.details },
    httpError.message,
  );
  res.status(httpError.statusCode).json({ error: httpError.message, code: httpError.code, details: httpError.details });
};
