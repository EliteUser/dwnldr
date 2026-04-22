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
import { getApiErrorFromRtkError, getApiErrorMessage } from './notify.utils';

describe('getApiErrorMessage', () => {
  it('maps known API codes to user-facing messages', () => {
    expect(getApiErrorMessage({ code: 'UNSUPPORTED_SOURCE' })).toBe(API_ERROR_MESSAGE.UNSUPPORTED_SOURCE);
    expect(getApiErrorMessage({ code: 'YOUTUBE_PLAYLIST' })).toBe(API_ERROR_MESSAGE.YOUTUBE_PLAYLIST);
    expect(getApiErrorMessage({ code: 'UPSTREAM_UNAUTHORIZED' })).toBe(API_ERROR_MESSAGE.UPSTREAM_UNAUTHORIZED);
  });

  it('falls back to the server error for invalid input', () => {
    expect(
      getApiErrorMessage({
        code: 'INVALID_INPUT',
        error: 'Track not found',
      }),
    ).toBe('Track not found');
  });
});

describe('getApiErrorFromRtkError', () => {
  it('extracts structured API payloads from RTK Query errors', () => {
    expect(
      getApiErrorFromRtkError({
        status: 502,
        data: {
          code: 'UPSTREAM_FAILURE',
          error: 'SoundCloud did not respond. Try again later.',
        },
      }),
    ).toEqual({
      code: 'UPSTREAM_FAILURE',
      error: 'SoundCloud did not respond. Try again later.',
    });
  });
});
