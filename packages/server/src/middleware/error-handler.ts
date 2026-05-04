import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

import { HttpError } from '../errors/http-error.js';
import { getLogger } from '../lib/logger.js';

const getHttpParserError = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null;
  }

  const { status, type } = error as { status?: unknown; type?: unknown };

  if (typeof status !== 'number' || status < 400 || status >= 500) {
    return null;
  }

  return {
    status,
    type: typeof type === 'string' ? type : undefined,
  };
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const logger = getLogger();

  if (error instanceof ZodError) {
    logger.warn(
      {
        evt: 'request.invalid',
        details: error.flatten(),
      },
      'Request validation failed',
    );

    res.status(400).json({
      error: 'Invalid request',
      code: 'INVALID_INPUT',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof HttpError) {
    logger.warn(
      {
        evt: 'request.failed',
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
      },
      error.message,
    );

    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const isTooLarge = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE', 'LIMIT_FIELD_KEY'].includes(error.code);

    logger.warn(
      {
        evt: 'request.upload.invalid',
        code: error.code,
        field: error.field,
      },
      error.message,
    );

    res.status(isTooLarge ? 413 : 400).json({
      error: isTooLarge ? 'Uploaded content is too large.' : 'Invalid upload.',
      code: 'INVALID_INPUT',
    });
    return;
  }

  const httpParserError = getHttpParserError(error);

  if (httpParserError) {
    logger.warn(
      {
        evt: 'request.invalid',
        statusCode: httpParserError.status,
        type: httpParserError.type,
      },
      'Request body parsing failed',
    );

    res.status(httpParserError.status).json({
      error: httpParserError.status === 413 ? 'Request body is too large.' : 'Invalid request body.',
      code: 'INVALID_INPUT',
    });
    return;
  }

  logger.error(
    {
      evt: 'request.failed.unhandled',
      ...(error instanceof Error ? { err: error } : { error: String(error) }),
    },
    'Unhandled server error',
  );

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};
