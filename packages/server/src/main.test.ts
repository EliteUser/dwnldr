import type { Server } from 'node:http';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGracefulShutdownHandler } from './main.js';
import { resetHealthStateForTests } from './services/health/health.service.js';

describe('createGracefulShutdownHandler', () => {
  afterEach(() => {
    resetHealthStateForTests();
  });

  it('stops accepting new connections and exits after close completes', () => {
    const closeIdleConnections = vi.fn();
    const closeAllConnections = vi.fn();
    const close = vi.fn((callback: (error?: Error) => void) => {
      callback();
      return server;
    });
    const server = {
      close,
      closeAllConnections,
      closeIdleConnections,
    } as unknown as Server;
    const tempSweepInterval = setInterval(() => undefined, 1000);
    const exit = vi.fn();
    const shutdown = createGracefulShutdownHandler({
      server,
      tempSweepInterval,
      exit,
    });

    shutdown('SIGTERM');

    expect(close).toHaveBeenCalledTimes(1);
    expect(closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(closeAllConnections).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });
});
