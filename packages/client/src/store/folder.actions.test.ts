import { beforeEach, describe, expect, it, vi } from 'vitest';

import { selectFolder, syncFolder } from './folder.actions';
import { useAppStore } from './index';

const { clearDirectoryHandleMock, loadDirectoryHandleMock, saveDirectoryHandleMock } = vi.hoisted(() => ({
  clearDirectoryHandleMock: vi.fn(),
  loadDirectoryHandleMock: vi.fn(),
  saveDirectoryHandleMock: vi.fn(),
}));

vi.mock('../utils/folder/directory-handle.utils', () => ({
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

const resetStore = () => {
  useAppStore.setState({
    directoryName: null,
    files: [],
    isFolderSyncInProgress: false,
    lastSyncAt: null,
    userId: null,
  });
};

describe('folder actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
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

    const result = await syncFolder();

    expect(result).toEqual({
      directoryName: 'Music',
      fileCount: 3,
      status: 'success',
    });
    expect(useAppStore.getState().files).toEqual([
      { extension: 'mp3', name: 'Artist - Root Track' },
      { extension: 'mp3', name: 'Artist - Nested Track' },
      { extension: 'flac', name: 'Artist - Deep Track' },
    ]);
  });

  it('clears stale folder state when the saved handle is unavailable', async () => {
    loadDirectoryHandleMock.mockResolvedValue(null);

    useAppStore.setState({
      directoryName: 'Music',
      files: [],
      isFolderSyncInProgress: false,
      lastSyncAt: '2026-04-23T10:00:00.000Z',
    });

    const result = await syncFolder();

    expect(result).toEqual({
      status: 'missing-handle',
    });
    expect(useAppStore.getState().directoryName).toBeNull();
    expect(useAppStore.getState().lastSyncAt).toBeNull();
    expect(clearDirectoryHandleMock).toHaveBeenCalledTimes(1);
  });

  it('does not persist a newly picked folder when sync cannot read it', async () => {
    const deniedHandle = createDirectoryHandle('Music', [createFileHandle('Artist - Track.mp3')], 'denied');

    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(deniedHandle));

    const result = await selectFolder();

    expect(result).toEqual({
      status: 'permission-denied',
    });
    expect(saveDirectoryHandleMock).not.toHaveBeenCalled();
    expect(useAppStore.getState().directoryName).toBeNull();
  });
});
