import type { ErrorRequestHandler } from 'express';

import { ZodError } from 'zod';

import { HttpError } from '../errors/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request',
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    error: 'Internal server error',
  });
};
