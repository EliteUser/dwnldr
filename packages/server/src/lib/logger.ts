import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

import { env } from '../config/env.js';

type RequestContext = {
  requestId: string;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogBindings = Record<string, unknown>;

type TimedOperationOptions<T> = {
  bindings?: LogBindings;
  failureEvt: string | ((error: unknown) => string);
  failureLevel?: LogLevel;
  failureMessage: string | ((error: unknown) => string);
  getFailureBindings?: (error: unknown) => LogBindings;
  getSuccessBindings?: (result: T) => LogBindings;
  startEvt: string;
  startMessage: string;
  successEvt: string;
  successLevel?: LogLevel;
  successMessage: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export const logger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export const withRequestContext = <T>(requestId: string, callback: () => T) =>
  requestContext.run({ requestId }, callback);

export const getRequestId = () => requestContext.getStore()?.requestId;

export const getLogger = (bindings?: LogBindings) => {
  const requestId = getRequestId();

  return logger.child({
    ...(requestId ? { requestId } : undefined),
    ...bindings,
  });
};

export const logTimedOperation = async <T>(options: TimedOperationOptions<T>, operation: () => Promise<T>) => {
  const currentLogger = getLogger(options.bindings);
  const startedAt = Date.now();

  currentLogger.info({ evt: options.startEvt }, options.startMessage);

  try {
    const result = await operation();
    const successLevel = options.successLevel ?? 'info';

    currentLogger[successLevel](
      {
        evt: options.successEvt,
        durationMs: Date.now() - startedAt,
        ...(options.getSuccessBindings ? options.getSuccessBindings(result) : {}),
      },
      options.successMessage,
    );

    return result;
  } catch (error) {
    const failureLevel = options.failureLevel ?? 'error';
    const failureEvt = typeof options.failureEvt === 'function' ? options.failureEvt(error) : options.failureEvt;
    const failureMessage =
      typeof options.failureMessage === 'function' ? options.failureMessage(error) : options.failureMessage;

    currentLogger[failureLevel](
      {
        evt: failureEvt,
        durationMs: Date.now() - startedAt,
        ...(error instanceof Error ? { err: error } : { error: String(error) }),
        ...(options.getFailureBindings ? options.getFailureBindings(error) : {}),
      },
      failureMessage,
    );

    throw error;
  }
};
