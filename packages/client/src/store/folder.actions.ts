import { isAbortError } from '../utils/common/common.utils';
import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from '../utils/folder/directory-handle.utils';
import { canUseFileSystemAccess, collectFiles, verifyPermission } from '../utils/folder/folder.utils';
import { useAppStore } from './index';

export type FolderSyncResult =
  | {
      status: 'aborted' | 'error' | 'missing-handle' | 'permission-denied' | 'unsupported';
    }
  | {
      directoryName: string;
      fileCount: number;
      status: 'success';
    };

const resetSyncedFolderState = async (options: { clearPersistedHandle?: boolean } = {}) => {
  useAppStore.getState().resetFolder();

  if (options.clearPersistedHandle) {
    await clearDirectoryHandle().catch(() => undefined);
  }
};

const syncDirectoryHandle = async (
  handle: FileSystemDirectoryHandle,
  options: {
    resetOnPermissionFailure?: boolean;
  } = {},
): Promise<FolderSyncResult> => {
  if (!(await verifyPermission(handle))) {
    if (options.resetOnPermissionFailure) {
      await resetSyncedFolderState({
        clearPersistedHandle: true,
      });
    }

    return {
      status: 'permission-denied',
    };
  }

  const fileList = await collectFiles(handle);
  const { setDirectoryName, setFiles, setLastSyncAt } = useAppStore.getState();

  setFiles(fileList);
  setDirectoryName(handle.name);
  setLastSyncAt(new Date().toISOString());

  return {
    directoryName: handle.name,
    fileCount: fileList.length,
    status: 'success',
  };
};

export const syncFolder = async (): Promise<FolderSyncResult> => {
  if (!canUseFileSystemAccess()) {
    return {
      status: 'unsupported',
    };
  }

  const { clearFiles, setFolderSyncInProgress } = useAppStore.getState();

  try {
    setFolderSyncInProgress(true);
    clearFiles();

    const savedHandle = await loadDirectoryHandle();

    if (!savedHandle) {
      await resetSyncedFolderState({
        clearPersistedHandle: true,
      });

      return {
        status: 'missing-handle',
      };
    }

    return await syncDirectoryHandle(savedHandle, {
      resetOnPermissionFailure: true,
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      return {
        status: 'aborted',
      };
    }

    return {
      status: 'error',
    };
  } finally {
    useAppStore.getState().setFolderSyncInProgress(false);
  }
};

export const selectFolder = async (): Promise<FolderSyncResult> => {
  if (!canUseFileSystemAccess()) {
    return {
      status: 'unsupported',
    };
  }

  try {
    useAppStore.getState().setFolderSyncInProgress(true);

    const dirHandle = await window.showDirectoryPicker();
    const syncResult = await syncDirectoryHandle(dirHandle, {
      resetOnPermissionFailure: false,
    });

    if (syncResult.status === 'success') {
      await saveDirectoryHandle(dirHandle);
    }

    return syncResult;
  } catch (error: unknown) {
    if (isAbortError(error)) {
      return {
        status: 'aborted',
      };
    }

    return {
      status: 'error',
    };
  } finally {
    useAppStore.getState().setFolderSyncInProgress(false);
  }
};
