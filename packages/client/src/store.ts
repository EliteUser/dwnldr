import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type FileData = {
  extension: string;
  name: string;
};

type AppState = {
  directoryName: string | null;
  /** Files found in the synced folder, used to mark liked tracks as downloaded. */
  files: FileData[];
  isFolderSyncInProgress: boolean;
  lastSyncAt: string | null;
  profileUrl: string | null;
};

const initialState: AppState = {
  directoryName: null,
  files: [],
  isFolderSyncInProgress: false,
  lastSyncAt: null,
  profileUrl: null,
};

export const useAppStore = create<AppState>()(
  persist(() => initialState, {
    name: 'dwnldr-store',
    version: 1,
    storage: createJSONStorage(() => localStorage),
    partialize: ({ isFolderSyncInProgress: _isFolderSyncInProgress, ...state }) => state,
  }),
);
