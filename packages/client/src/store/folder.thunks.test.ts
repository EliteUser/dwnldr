import type { AppThunk } from './index';

import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import filesReducer from './files.slice';
import { selectFolder, syncFolder } from './folder.thunks';

const { clearDirectoryHandleMock, loadDirectoryHandleMock, saveDirectoryHandleMock } = vi.hoisted(() => ({
  clearDirectoryHandleMock: vi.fn(),
  loadDirectoryHandleMock: vi.fn(),
  saveDirectoryHandleMock: vi.fn(),
}));

vi.mock('../utils/directory-handle.utils', () => ({
  clearDirectoryHandle: clearDirectoryHandleMock,
  loadDirectoryHandle: loadDirectoryHandleMock,
  saveDirectoryHandle: saveDirectoryHandleMock,
}));

type MockFileHandle = {
  kind: 'file';
  name: string;
};

type MockDirectoryHandle = {
  kind: 'directory';
  name: string;
  queryPermission: () => Promise<PermissionState>;
  requestPermission: () => Promise<PermissionState>;
  values: () => AsyncIterable<MockDirectoryHandle | MockFileHandle>;
};

const createDirectoryHandle = (
  name: string,
  entries: Array<MockDirectoryHandle | MockFileHandle>,
  permission: PermissionState = 'granted',
): FileSystemDirectoryHandle =>
  ({
    kind: 'directory',
    name,
    queryPermission: vi.fn().mockResolvedValue(permission),
    requestPermission: vi.fn().mockResolvedValue(permission),
    values: async function* () {
      for (const entry of entries) {
        yield entry;
      }
    },
  }) as unknown as FileSystemDirectoryHandle;

const createFileHandle = (name: string): MockFileHandle => ({
  kind: 'file',
  name,
});

const createStore = () =>
  configureStore({
    reducer: {
      files: filesReducer,
    },
  });

const dispatchThunk = <T>(store: ReturnType<typeof createStore>, thunk: AppThunk<Promise<T>>) =>
  store.dispatch(thunk as never) as Promise<T>;

describe('folder thunks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDirectoryHandleMock.mockResolvedValue(undefined);
    saveDirectoryHandleMock.mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal('showDirectoryPicker', vi.fn());
  });

  it('syncs files from nested directories and skips directory names', async () => {
    loadDirectoryHandleMock.mockResolvedValue(
      createDirectoryHandle('Music', [
        createFileHandle('Artist - Root Track.mp3'),
        createDirectoryHandle('Albums', [
          createFileHandle('Artist - Nested Track.mp3'),
          createDirectoryHandle('Disc 2', [createFileHandle('Artist - Deep Track.flac')]),
        ]),
      ]),
    );

    const store = createStore();
    const result = await dispatchThunk(store, syncFolder());

    expect(result).toEqual({
      directoryName: 'Music',
      fileCount: 3,
      status: 'success',
    });
    expect(store.getState().files.files).toEqual([
      { extension: 'mp3', name: 'Artist - Root Track' },
      { extension: 'mp3', name: 'Artist - Nested Track' },
      { extension: 'flac', name: 'Artist - Deep Track' },
    ]);
  });

  it('clears stale folder state when the saved handle is unavailable', async () => {
    loadDirectoryHandleMock.mockResolvedValue(null);

    const store = configureStore({
      reducer: {
        files: filesReducer,
      },
      preloadedState: {
        files: {
          directoryName: 'Music',
          files: [],
          lastSyncAt: '2026-04-23T10:00:00.000Z',
          loading: false,
        },
      },
    });

    const result = await dispatchThunk(store, syncFolder());

    expect(result).toEqual({
      status: 'missing-handle',
    });
    expect(store.getState().files.directoryName).toBeNull();
    expect(store.getState().files.lastSyncAt).toBeNull();
    expect(clearDirectoryHandleMock).toHaveBeenCalledTimes(1);
  });

  it('does not persist a newly picked folder when sync cannot read it', async () => {
    const deniedHandle = createDirectoryHandle('Music', [createFileHandle('Artist - Track.mp3')], 'denied');

    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(deniedHandle));

    const store = createStore();
    const result = await dispatchThunk(store, selectFolder());

    expect(result).toEqual({
      status: 'permission-denied',
    });
    expect(saveDirectoryHandleMock).not.toHaveBeenCalled();
    expect(store.getState().files.directoryName).toBeNull();
  });
});
