import type { FileData } from '../types';

import { store } from '../store';
import { clearFiles, setDirectoryName, setFiles, setLoading } from '../store/files.slice';
import { getFileData } from './common.utils';
import { loadDirectoryHandle, saveDirectoryHandle } from './directory-handle.utils';

const FILE_SYSTEM_ACCESS_ERROR_MESSAGE =
  'File system access requires a supported browser and a trusted secure context (HTTPS or localhost).';

export const FILE_SYSTEM_ACCESS_HELP_TEXT =
  'Folder sync works only in browsers that support the File System Access API and only in a secure context.';

export const canUseFileSystemAccess = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'showDirectoryPicker' in window;

const verifyPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
    return true;
  } else if ((await handle.requestPermission({ mode: 'read' })) === 'granted') {
    return true;
  }

  return false;
};

export const handleSyncFolder = async () => {
  if (!canUseFileSystemAccess()) {
    return;
  }

  try {
    store.dispatch(setLoading(true));
    store.dispatch(clearFiles());

    const savedHandle = await loadDirectoryHandle();

    if (!savedHandle || !(await verifyPermission(savedHandle))) {
      return;
    }

    const fileList: FileData[] = [];
    for await (const fileName of savedHandle.keys()) {
      fileList.push(getFileData(fileName));
    }

    store.dispatch(setFiles(fileList));
  } catch (error: unknown) {
    if ((error as { name?: string }).name !== 'AbortError') {
      console.error('Error selecting folder:', error);
    }
  } finally {
    store.dispatch(setLoading(false));
  }
};

export const handleSelectFolder = async () => {
  if (!canUseFileSystemAccess()) {
    window.alert(FILE_SYSTEM_ACCESS_ERROR_MESSAGE);
    return;
  }

  try {
    const dirHandle = await window.showDirectoryPicker();

    await saveDirectoryHandle(dirHandle);

    store.dispatch(setDirectoryName(dirHandle.name));

    await handleSyncFolder();
  } catch (error: unknown) {
    console.error('Error picking folder', error);
  }
};
