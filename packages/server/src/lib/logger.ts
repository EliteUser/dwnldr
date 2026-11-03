import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

import { env } from '../config/env.js';

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export const logger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export const withRequestContext = <T>(requestId: string, callback: () => T) =>
  requestContext.run({ requestId }, callback);

/** Logger bound to the current request ID, when there is one. */
export const getLogger = () => {
  const requestId = requestContext.getStore()?.requestId;

  return requestId ? logger.child({ requestId }) : logger;
};
