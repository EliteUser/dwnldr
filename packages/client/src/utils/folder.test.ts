import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { useAppStore as Store } from '../store';
import type * as Folder from './folder';

let folder: typeof Folder;
let useAppStore: typeof Store;
let savedHandle: unknown;

const request = (result: unknown) => {
  const pending = { result, onsuccess: () => undefined };
  queueMicrotask(() => pending.onsuccess());
  return pending;
};

const makeHandle = (existing: string[] = []) => {
  const names = new Set(existing);
  const written: string[] = [];
  return {
    name: 'Music',
    written,
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    values: async function* () {
      for (const name of names) yield { kind: 'file', name };
    },
    getFileHandle: vi.fn(async (name: string, options?: FileSystemGetFileOptions) => {
      if (!names.has(name) && !options?.create) throw new DOMException('Missing', 'NotFoundError');
      names.add(name);
      return { createWritable: async () => ({ write: async () => written.push(name), close: async () => undefined }) };
    }),
  };
};

beforeEach(async () => {
  vi.resetModules();
  savedHandle = undefined;
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('showDirectoryPicker', vi.fn());
  vi.stubGlobal('indexedDB', {
    open: () =>
      request({
        close: vi.fn(),
        transaction: () => ({
          objectStore: () => ({
            get: () => request(savedHandle),
            put: (handle: unknown) => {
              savedHandle = handle;
              return request(undefined);
            },
          }),
        }),
      }),
  });
  folder = await import('./folder');
  ({ useAppStore } = await import('../store'));
});

describe('folder downloads', () => {
  it('selects a writable folder and enables saving downloads to it', async () => {
    const handle = makeHandle(['Existing.mp3']);
    vi.mocked(window.showDirectoryPicker).mockResolvedValue(handle as unknown as FileSystemDirectoryHandle);

    expect(await folder.selectFolder()).toEqual({ ok: true, directoryName: 'Music', fileCount: 1 });
    expect(window.showDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' });
    expect(useAppStore.getState().saveDownloadsToFolder).toBe(true);
    expect(await folder.getDownloadFolder()).toBe(handle);
  });

  it('uses browser downloads when the setting is off', async () => {
    expect(await folder.getDownloadFolder()).toBeNull();
  });

  it('requests write permission for a restored handle', async () => {
    const handle = makeHandle();
    handle.queryPermission.mockResolvedValue('prompt');
    savedHandle = handle;
    useAppStore.setState({ saveDownloadsToFolder: true });

    expect(await folder.getDownloadFolder()).toBe(handle);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('throws when write permission is denied', async () => {
    const handle = makeHandle();
    handle.queryPermission.mockResolvedValue('prompt');
    handle.requestPermission.mockResolvedValue('denied');
    savedHandle = handle;
    useAppStore.setState({ saveDownloadsToFolder: true });

    await expect(folder.getDownloadFolder()).rejects.toThrow('permission');
  });

  it('saves a numbered copy instead of overwriting and adds it to the index', async () => {
    const handle = makeHandle(['Track.mp3', 'Track (1).mp3']);

    expect(await folder.saveToFolder(handle as unknown as FileSystemDirectoryHandle, 'Track.mp3', new Blob())).toBe(
      'Track (2).mp3',
    );
    expect(handle.written).toEqual(['Track (2).mp3']);
    expect(useAppStore.getState().files).toContainEqual({ name: 'Track (2)', extension: 'mp3' });
  });
});
