import type { AppThunk } from './index';

import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from '../utils/directory-handle.utils';
import { canUseFileSystemAccess, collectFiles, verifyPermission } from '../utils/folder.utils';
import { clearFiles, setDirectoryName, setFiles, setLastSyncAt, setLoading } from './files.slice';

export type FolderSyncResult =
  | {
      status: 'aborted' | 'error' | 'missing-handle' | 'permission-denied' | 'unsupported';
    }
  | {
      directoryName: string;
      fileCount: number;
      status: 'success';
    };

const resetSyncedFolderState = async (
  dispatch: (action: unknown) => void,
  options: { clearPersistedHandle?: boolean } = {},
) => {
  dispatch(clearFiles());
  dispatch(setDirectoryName(null));
  dispatch(setLastSyncAt(null));

  if (options.clearPersistedHandle) {
    await clearDirectoryHandle().catch(() => undefined);
  }
};

const syncDirectoryHandle = async (
  dispatch: (action: unknown) => void,
  handle: FileSystemDirectoryHandle,
  options: {
    resetOnPermissionFailure?: boolean;
  } = {},
): Promise<FolderSyncResult> => {
  if (!(await verifyPermission(handle))) {
    if (options.resetOnPermissionFailure) {
      await resetSyncedFolderState(dispatch, {
        clearPersistedHandle: true,
      });
    }

    return {
      status: 'permission-denied',
    };
  }

  const fileList = await collectFiles(handle);

  dispatch(setFiles(fileList));
  dispatch(setDirectoryName(handle.name));
  dispatch(setLastSyncAt(new Date().toISOString()));

  return {
    directoryName: handle.name,
    fileCount: fileList.length,
    status: 'success',
  };
};

const isAbortError = (error: unknown) => (error as { name?: string }).name === 'AbortError';

export const syncFolder = (): AppThunk<Promise<FolderSyncResult>> => async (dispatch) => {
  if (!canUseFileSystemAccess()) {
    return {
      status: 'unsupported',
    };
  }

  try {
    dispatch(setLoading(true));
    dispatch(clearFiles());

    const savedHandle = await loadDirectoryHandle();

    if (!savedHandle) {
      await resetSyncedFolderState(dispatch, {
        clearPersistedHandle: true,
      });

      return {
        status: 'missing-handle',
      };
    }

    return await syncDirectoryHandle(dispatch, savedHandle, {
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
    dispatch(setLoading(false));
  }
};

export const selectFolder = (): AppThunk<Promise<FolderSyncResult>> => async (dispatch) => {
  if (!canUseFileSystemAccess()) {
    return {
      status: 'unsupported',
    };
  }

  try {
    dispatch(setLoading(true));

    const dirHandle = await window.showDirectoryPicker();
    const syncResult = await syncDirectoryHandle(dispatch, dirHandle, {
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
    dispatch(setLoading(false));
  }
};
