import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error.js';

let activeOperationCount = 0;

export const heavyOperationGuard: RequestHandler = (_req, res, next) => {
  if (activeOperationCount >= 1) {
    res.setHeader('Retry-After', '30');
    next(
      new HttpError(503, 'The server is busy processing another media operation. Try again shortly.', {
        code: 'SERVER_BUSY',
      }),
    );
    return;
  }

  activeOperationCount += 1;
  let released = false;

  const release = () => {
    if (released) {
      return;
    }

    released = true;
    activeOperationCount -= 1;
  };

  res.once('finish', release);
  res.once('close', release);
  next();
};

export const resetHeavyOperationGuardForTests = () => {
  activeOperationCount = 0;
};
