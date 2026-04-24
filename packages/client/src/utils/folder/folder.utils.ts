import type { FileData } from '../../types';

import { getFileData } from '../common/common.utils';

export const FILE_SYSTEM_ACCESS_HELP_TEXT =
  'Folder sync works only in browsers that support the File System Access API and only in a secure context.';

export const canUseFileSystemAccess = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'showDirectoryPicker' in window;

export const verifyPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
    return true;
  }

  return (await handle.requestPermission({ mode: 'read' })) === 'granted';
};

export const collectFiles = async (handle: FileSystemDirectoryHandle): Promise<FileData[]> => {
  const fileList: FileData[] = [];

  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      fileList.push(getFileData(entry.name));
      continue;
    }

    fileList.push(...(await collectFiles(entry)));
  }

  return fileList;
};
