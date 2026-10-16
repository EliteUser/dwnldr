import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from './index';

describe('app store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      directoryName: null,
      files: [],
      isFolderSyncInProgress: false,
      lastSyncAt: null,
      profileUrl: null,
    });
    useAppStore.persist.clearStorage();
  });

  it('migrates version 0 state by dropping userId and keeping folder state', async () => {
    const files = [{ extension: 'mp3', name: 'Artist - Track' }];
    localStorage.setItem('userId', '123456');
    localStorage.setItem(
      'dwnldr-store',
      JSON.stringify({
        state: {
          directoryName: 'Music',
          files,
          lastSyncAt: '2026-04-23T10:00:00.000Z',
          userId: '123456',
        },
        version: 0,
      }),
    );

    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState()).toMatchObject({
      directoryName: 'Music',
      files,
      lastSyncAt: '2026-04-23T10:00:00.000Z',
      profileUrl: null,
    });
    expect('userId' in useAppStore.getState()).toBe(false);
    expect(localStorage.getItem('userId')).toBeNull();

    const savedState = JSON.parse(localStorage.getItem('dwnldr-store') || '{}') as {
      state?: Record<string, unknown>;
      version?: number;
    };
    expect(savedState.version).toBe(1);
    expect(savedState.state).not.toHaveProperty('userId');
  });

  it('sanitizes version 1 state and preserves store actions', async () => {
    const files = [
      { extension: 'mp3', name: 'Artist - Track' },
      { extension: 'flac', name: 'Artist - Lossless Track', extra: 'discarded' },
      { extension: 'mp3' },
      { name: 'Missing extension' },
      { extension: 12, name: 'Invalid extension' },
      null,
    ];
    const setProfileUrl = useAppStore.getState().setProfileUrl;
    localStorage.setItem(
      'dwnldr-store',
      JSON.stringify({
        state: {
          clearProfileUrl: 'corrupt action',
          directoryName: 'Music',
          files,
          lastSyncAt: '2026-04-23T10:00:00.000Z',
          profileUrl: 'http://www.soundcloud.com/artist/likes?utm_source=test',
          setProfileUrl: 'corrupt action',
        },
        version: 1,
      }),
    );

    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState()).toMatchObject({
      directoryName: 'Music',
      files: [
        { extension: 'mp3', name: 'Artist - Track' },
        { extension: 'flac', name: 'Artist - Lossless Track' },
      ],
      lastSyncAt: '2026-04-23T10:00:00.000Z',
      profileUrl: 'https://soundcloud.com/artist',
    });
    expect(useAppStore.getState().setProfileUrl).toBe(setProfileUrl);
    expect(typeof useAppStore.getState().clearProfileUrl).toBe('function');
  });

  it('clears an invalid persisted sync timestamp', async () => {
    localStorage.setItem(
      'dwnldr-store',
      JSON.stringify({
        state: { lastSyncAt: 'not a timestamp' },
        version: 1,
      }),
    );

    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().lastSyncAt).toBeNull();
  });

  it.each([123456, {}, 'not a profile URL', 'https://soundcloud.com/artist/track'])(
    'clears invalid version 1 profile values: %s',
    async (profileUrl) => {
      localStorage.setItem(
        'dwnldr-store',
        JSON.stringify({
          state: { profileUrl },
          version: 1,
        }),
      );

      await useAppStore.persist.rehydrate();

      expect(useAppStore.getState().profileUrl).toBeNull();
    },
  );

  it('removes the legacy userId key when only legacy storage exists', async () => {
    localStorage.setItem('userId', '123456');
    useAppStore.setState({ directoryName: 'Legacy Music' });

    await useAppStore.persist.rehydrate();

    expect(localStorage.getItem('userId')).toBeNull();
    expect(useAppStore.getState().profileUrl).toBeNull();
    expect(useAppStore.getState().directoryName).toBe('Legacy Music');
  });
});
