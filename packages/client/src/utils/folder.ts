import { type FileData, useAppStore } from '../store';
import { getFileData, isAbortError } from './common';

export type FolderSyncResult =
  | { ok: true; directoryName: string; fileCount: number }
  /** `message` is null when the user cancelled the picker. */
  | { ok: false; message: string | null };

const HANDLE_KEY = 'folderHandle';
const STORE_NAME = 'dwnldr';

/**
 * The handle granted in this session. A handle restored from IndexedDB starts out as "prompt" again,
 * and Android Chrome does not carry the grant over to it, so reusing this one avoids re-asking on every sync.
 */
let sessionHandle: FileSystemDirectoryHandle | undefined;

export const canUseFileSystemAccess = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'showDirectoryPicker' in window;

// The directory handle cannot go to localStorage, so it is kept in IndexedDB.
const withHandleStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('dwnldr-app', 1);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    // Closing lets the pending transaction finish and frees the connection.
    database.close();
  }
};

export const collectFiles = async (handle: FileSystemDirectoryHandle): Promise<FileData[]> => {
  const files: FileData[] = [];

  for await (const entry of handle.values()) {
    files.push(...(entry.kind === 'file' ? [getFileData(entry.name)] : await collectFiles(entry)));
  }

  return files;
};

const hasReadPermission = async (handle: FileSystemDirectoryHandle) =>
  (await handle.queryPermission({ mode: 'read' })) === 'granted' ||
  (await handle.requestPermission({ mode: 'read' })) === 'granted';

const indexFolder = async (handle: FileSystemDirectoryHandle): Promise<FolderSyncResult> => {
  if (!(await hasReadPermission(handle))) {
    return { ok: false, message: 'Folder permission was not granted. Pick the folder again in Settings.' };
  }

  sessionHandle = handle;

  const files = await collectFiles(handle);

  useAppStore.setState({ directoryName: handle.name, files, lastSyncAt: new Date().toISOString() });

  return { ok: true, directoryName: handle.name, fileCount: files.length };
};

const runFolderTask = async (task: () => Promise<FolderSyncResult>, errorMessage: string) => {
  if (!canUseFileSystemAccess()) {
    return { ok: false, message: 'Folder access is not available in this browser or connection.' } as const;
  }

  useAppStore.setState({ isFolderSyncInProgress: true });

  try {
    return await task();
  } catch (error) {
    return { ok: false, message: isAbortError(error) ? null : errorMessage } as const;
  } finally {
    useAppStore.setState({ isFolderSyncInProgress: false });
  }
};

export const selectFolder = () =>
  runFolderTask(async () => {
    const handle = await window.showDirectoryPicker();
    const result = await indexFolder(handle);

    if (result.ok) {
      await withHandleStore('readwrite', (store) => store.put(handle, HANDLE_KEY));
    }

    return result;
  }, 'Could not open the folder picker.');

export const syncFolder = () =>
  runFolderTask(async () => {
    const handle =
      sessionHandle ??
      (await withHandleStore<FileSystemDirectoryHandle | undefined>('readonly', (store) => store.get(HANDLE_KEY)));

    return handle ? indexFolder(handle) : { ok: false, message: 'Pick a folder in Settings before syncing.' };
  }, 'Could not sync the selected folder.');
