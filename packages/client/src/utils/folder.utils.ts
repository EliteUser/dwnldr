import type { FileData } from '../types';

import { store } from '../store';
import { clearFiles, setDirectoryName, setFiles, setLastSyncAt, setLoading } from '../store/files.slice';
import { getFileData } from './common.utils';
import { loadDirectoryHandle, saveDirectoryHandle } from './directory-handle.utils';
import { FOLDER_NOTIFICATION_MESSAGE, FOLDER_NOTIFICATION_NAME } from './notify.constants';
import { notify } from './notify.utils';

type SyncFolderOptions = {
  notifyOnStart?: boolean;
  notifyOnSuccess?: boolean;
};

type SyncFolderResult = {
  directoryName: string;
  fileCount: number;
};

export const FILE_SYSTEM_ACCESS_HELP_TEXT =
  'Folder sync works only in browsers that support the File System Access API and only in a secure context.';

export const canUseFileSystemAccess = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'showDirectoryPicker' in window;

const verifyPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
    return true;
  }

  return (await handle.requestPermission({ mode: 'read' })) === 'granted';
};

export const handleSyncFolder = async (
  options: SyncFolderOptions = {
    notifyOnStart: true,
    notifyOnSuccess: true,
  },
): Promise<SyncFolderResult | null> => {
  if (!canUseFileSystemAccess()) {
    return null;
  }

  try {
    store.dispatch(setLoading(true));
    store.dispatch(clearFiles());

    const savedHandle = await loadDirectoryHandle();

    if (!savedHandle || !(await verifyPermission(savedHandle))) {
      return null;
    }

    if (options.notifyOnStart) {
      notify.info(FOLDER_NOTIFICATION_MESSAGE.syncStarted(savedHandle.name), {
        name: FOLDER_NOTIFICATION_NAME.syncStarted,
      });
    }

    const fileList: FileData[] = [];
    for await (const fileName of savedHandle.keys()) {
      fileList.push(getFileData(fileName));
    }

    store.dispatch(setFiles(fileList));
    store.dispatch(setDirectoryName(savedHandle.name));
    store.dispatch(setLastSyncAt(new Date().toISOString()));

    const result = {
      directoryName: savedHandle.name,
      fileCount: fileList.length,
    };

    if (options.notifyOnSuccess) {
      notify.success(FOLDER_NOTIFICATION_MESSAGE.syncSuccess(result.fileCount, result.directoryName), {
        name: FOLDER_NOTIFICATION_NAME.syncSuccess,
      });
    }

    return result;
  } catch (error: unknown) {
    if ((error as { name?: string }).name !== 'AbortError') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.syncError, {
        name: FOLDER_NOTIFICATION_NAME.syncError,
      });
    }
  } finally {
    store.dispatch(setLoading(false));
  }

  return null;
};

export const handleSelectFolder = async () => {
  if (!canUseFileSystemAccess()) {
    notify.error(FOLDER_NOTIFICATION_MESSAGE.fileSystemAccessError, {
      name: FOLDER_NOTIFICATION_NAME.apiUnsupported,
    });
    return;
  }

  try {
    const dirHandle = await window.showDirectoryPicker();

    await saveDirectoryHandle(dirHandle);

    store.dispatch(setDirectoryName(dirHandle.name));

    await handleSyncFolder();
  } catch (error: unknown) {
    if ((error as { name?: string }).name !== 'AbortError') {
      notify.error(FOLDER_NOTIFICATION_MESSAGE.pickerError, {
        name: FOLDER_NOTIFICATION_NAME.pickerError,
      });
    }
  }
};
