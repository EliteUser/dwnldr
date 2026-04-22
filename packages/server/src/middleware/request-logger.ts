import type { RequestHandler } from 'express';

import crypto from 'node:crypto';

import { logger, withRequestContext } from '../lib/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1000000n);

    logger.info(
      {
        evt: 'http.request.completed',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      },
      'Request completed',
    );
  });

  withRequestContext(requestId, next);
};
