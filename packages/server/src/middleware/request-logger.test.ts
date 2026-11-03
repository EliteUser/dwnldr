import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../lib/logger.js';
import { requestLogger } from './request-logger.js';

class MockResponse extends EventEmitter {
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
      originalUrl: '/api/download?token=secret',
    } as const;
    const res = new MockResponse();
    const next = vi.fn();

    requestLogger(req as never, res as never, next);
    res.emit('close');

    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        evt: 'http.request.aborted',
        method: 'GET',
        path: '/api/download',
        statusCode: 200,
      }),
      'Request aborted before the response finished',
    );
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs completed requests without their query string', () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    const res = new MockResponse();

    requestLogger({ method: 'GET', originalUrl: '/api/tracks?url=secret' } as never, res as never, vi.fn());
    res.writableFinished = true;
    res.emit('close');

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ evt: 'http.request.completed', path: '/api/tracks' }),
      'Request completed',
    );
  });
});
