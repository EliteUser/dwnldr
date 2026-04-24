import { describe, expect, it, vi } from 'vitest';

vi.mock('@gravity-ui/uikit', () => ({
  useToaster: () => ({
    add: () => undefined,
  }),
}));

vi.mock('@gravity-ui/uikit/toaster-singleton', () => ({
  toaster: {
    add: () => undefined,
  },
}));

import { API_ERROR_MESSAGE } from './notify.constants';
import { getApiErrorFromQueryError, getApiErrorMessage } from './notify.utils';

describe('getApiErrorMessage', () => {
  it('maps known API codes to user-facing messages', () => {
    expect(getApiErrorMessage({ code: 'UNSUPPORTED_SOURCE' })).toBe(API_ERROR_MESSAGE.UNSUPPORTED_SOURCE);
    expect(getApiErrorMessage({ code: 'YOUTUBE_PLAYLIST' })).toBe(API_ERROR_MESSAGE.YOUTUBE_PLAYLIST);
    expect(getApiErrorMessage({ code: 'UPSTREAM_UNAUTHORIZED' })).toBe(API_ERROR_MESSAGE.UPSTREAM_UNAUTHORIZED);
  });

  it('uses safe server messages for invalid input', () => {
    expect(
      getApiErrorMessage({
        code: 'INVALID_INPUT',
        error: 'Track not found',
      }),
    ).toBe('Track not found');
  });

  it('does not expose raw server messages for internal failures', () => {
    expect(
      getApiErrorMessage({
        code: 'INTERNAL_ERROR',
        error: 'YouTube service is not started',
      }),
    ).toBe(API_ERROR_MESSAGE.INTERNAL_ERROR);
  });
});

describe('getApiErrorFromQueryError', () => {
  it('extracts structured API payloads from query errors', () => {
    expect(
      getApiErrorFromQueryError({
        response: {
          code: 'UPSTREAM_FAILURE',
          error: 'SoundCloud did not respond. Try again later.',
        },
        status: 502,
      }),
    ).toEqual({
      code: 'UPSTREAM_FAILURE',
      error: 'SoundCloud did not respond. Try again later.',
    });
  });
});
