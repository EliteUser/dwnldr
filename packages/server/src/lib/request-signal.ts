import type { Response } from 'express';

/**
 * Aborts when the client disconnects before the response is complete, so long-running work stops with it.
 */
export const getRequestSignal = (res: Response) => {
  const controller = new AbortController();

  res.once('close', () => {
    if (!res.writableFinished) {
      controller.abort(new DOMException('Client disconnected before the response finished.', 'AbortError'));
    }
  });

  return controller.signal;
};
