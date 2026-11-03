import type { RequestHandler } from 'express';
import crypto from 'node:crypto';

import { logger, withRequestContext } from '../lib/logger.js';

/** Logs one line per request. The query string is left out: it can carry private track URLs. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  const path = req.originalUrl.split('?')[0];

  res.setHeader('X-Request-Id', requestId);
  res.once('close', () => {
    if (path === '/health') {
      return;
    }

    const aborted = !res.writableFinished;

    logger[aborted ? 'warn' : 'info'](
      {
        evt: aborted ? 'http.request.aborted' : 'http.request.completed',
        requestId,
        clientIp: req.ip,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      },
      aborted ? 'Request aborted before the response finished' : 'Request completed',
    );
  });

  withRequestContext(requestId, next);
};
