import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../lib/logger.js';
import { requestLogger } from './request-logger.js';

class MockResponse extends EventEmitter {
  public readonly locals: Record<string, unknown> = {};
  public statusCode = 200;
  public writableFinished = false;

  public readonly setHeader = vi.fn();
}

describe('requestLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs aborted requests when the connection closes before finish', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    const req = {
      method: 'GET',
      originalUrl: '/api/download',
    } as const;
    const res = new MockResponse();
    const next = vi.fn();

    requestLogger(req as never, res as never, next);
    res.emit('close');

    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        aborted: true,
        evt: 'http.request.aborted',
        method: 'GET',
        path: '/api/download',
        statusCode: 200,
      }),
      'Request aborted before the response finished',
    );
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
