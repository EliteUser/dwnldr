import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger.js';
import { logInvalidSoundCloudClientIdOnce, resetSoundCloudDiagnosticsForTests } from './soundcloud-diagnostics.js';

describe('logInvalidSoundCloudClientIdOnce', () => {
  const errorMock = vi.fn();
  const childSpy = vi.spyOn(logger, 'child');

  beforeEach(() => {
    resetSoundCloudDiagnosticsForTests();
    errorMock.mockReset();
    childSpy.mockReturnValue({
      error: errorMock,
    } as unknown as typeof logger);
  });

  afterEach(() => {
    childSpy.mockReset();
    resetSoundCloudDiagnosticsForTests();
  });

  it('logs only the first unauthorized error per process lifetime', () => {
    const unauthorizedError = {
      response: {
        status: 401,
      },
    };

    expect(logInvalidSoundCloudClientIdOnce(unauthorizedError, { url: 'https://soundcloud.com/test/track' })).toBe(
      true,
    );
    expect(logInvalidSoundCloudClientIdOnce(unauthorizedError, { url: 'https://soundcloud.com/test/track-2' })).toBe(
      false,
    );

    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        evt: 'sc.client_id.invalid',
        statusCode: 401,
      }),
      'SoundCloud rejected the embedded client_id. Restart the server to refresh it.',
    );
  });

  it('ignores non-unauthorized errors', () => {
    expect(logInvalidSoundCloudClientIdOnce(new Error('network down'))).toBe(false);
    expect(errorMock).not.toHaveBeenCalled();
  });
});
