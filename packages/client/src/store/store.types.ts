import type { FileData } from '../types';

export type AppState = {
  directoryName: string | null;
  files: FileData[];
  isFolderSyncInProgress: boolean;
  lastSyncAt: string | null;
  profileUrl: string | null;
};

export type AppActions = {
  clearFiles: () => void;
  clearProfileUrl: () => void;
  resetFolder: () => void;
  setDirectoryName: (directoryName: string | null) => void;
  setFiles: (files: FileData[]) => void;
  setFolderSyncInProgress: (isFolderSyncInProgress: boolean) => void;
  setLastSyncAt: (lastSyncAt: string | null) => void;
  setProfileUrl: (profileUrl: string) => void;
};

export type AppStore = AppState & AppActions;

export type PersistedAppState = Pick<AppState, 'directoryName' | 'files' | 'lastSyncAt' | 'profileUrl'>;
