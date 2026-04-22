import type { ErrorRequestHandler } from 'express';

import { ZodError } from 'zod';

import { HttpError } from '../errors/http-error.js';
import { getLogger } from '../lib/logger.js';

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
