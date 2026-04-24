import { beforeEach, describe, expect, it } from 'vitest';

import { canUseFileSystemAccess, collectFiles, verifyPermission } from './folder.utils';

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
    queryPermission: async () => permission,
    requestPermission: async () => permission,
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

describe('folder utils', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  it('detects File System Access support in a secure context', () => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: () => Promise.resolve(),
    });

    expect(canUseFileSystemAccess()).toBe(true);
  });

  it('collects files from nested directories', async () => {
    const files = await collectFiles(
      createDirectoryHandle('Music', [
        createFileHandle('Artist - Root Track.mp3'),
        createDirectoryHandle('Albums', [
          createFileHandle('Artist - Nested Track.mp3'),
          createDirectoryHandle('Disc 2', [createFileHandle('Artist - Deep Track.flac')]),
        ]),
      ]),
    );

    expect(files).toEqual([
      { extension: 'mp3', name: 'Artist - Root Track' },
      { extension: 'mp3', name: 'Artist - Nested Track' },
      { extension: 'flac', name: 'Artist - Deep Track' },
    ]);
  });

  it('requests permission when the handle is not already granted', async () => {
    const handle = createDirectoryHandle('Music', [], 'prompt');

    expect(await verifyPermission(handle)).toBe(false);
  });
});
