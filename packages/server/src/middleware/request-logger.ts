import type { RequestHandler } from 'express';

import crypto from 'node:crypto';

import { logger, withRequestContext } from '../lib/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();
  let logged = false;

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const logRequest = (options: { aborted?: boolean; evt: string; level: 'info' | 'warn' }) => {
    if (logged) {
      return;
    }

    logged = true;
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1000000n);

    logger[options.level](
      {
        evt: options.evt,
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ...(options.aborted ? { aborted: true } : undefined),
      },
      options.aborted ? 'Request aborted before the response finished' : 'Request completed',
    );
  };

  res.once('finish', () => {
    logRequest({
      evt: 'http.request.completed',
      level: 'info',
    });
  });

  res.once('close', () => {
    if (res.writableFinished) {
      return;
    }

    logRequest({
      aborted: true,
      evt: 'http.request.aborted',
      level: 'warn',
    });
  });

  withRequestContext(requestId, next);
};
