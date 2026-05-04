import { notifications } from '@mantine/notifications';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERROR_MESSAGE } from './notify.constants';
import { getApiErrorFromQueryError, getApiErrorMessage, notify } from './notify.utils';

const notificationsMock = vi.mocked(notifications);

beforeEach(() => {
  notificationsMock.show.mockClear();
  notificationsMock.update.mockClear();
});

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

describe('notify', () => {
  it('updates an existing notification when requested', () => {
    notify.info('Syncing Music', {
      autoClose: false,
      loading: true,
      name: 'folder-sync-started',
      withCloseButton: false,
    });
    notify.success('2 files found in Music', {
      name: 'folder-sync-started',
      update: true,
    });

    expect(notificationsMock.show).toHaveBeenCalledWith(
      expect.objectContaining({
        autoClose: false,
        color: 'blue',
        id: 'folder-sync-started',
        loading: true,
        message: 'Syncing Music',
        withCloseButton: false,
      }),
    );
    expect(notificationsMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        autoClose: 4000,
        color: 'green',
        id: 'folder-sync-started',
        loading: false,
        message: '2 files found in Music',
        withCloseButton: true,
      }),
    );
  });
});
