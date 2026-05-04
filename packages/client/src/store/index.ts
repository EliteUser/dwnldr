import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FileData } from '../types';

type AppState = {
  directoryName: string | null;
  files: FileData[];
  isFolderSyncInProgress: boolean;
  lastSyncAt: string | null;
  userId: string | null;
};

type AppActions = {
  clearFiles: () => void;
  clearUserId: () => void;
  resetFolder: () => void;
  setDirectoryName: (directoryName: string | null) => void;
  setFiles: (files: FileData[]) => void;
  setFolderSyncInProgress: (isFolderSyncInProgress: boolean) => void;
  setLastSyncAt: (lastSyncAt: string | null) => void;
  setUserId: (userId: string) => void;
};

export type AppStore = AppState & AppActions;

const readLegacyStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const initialState: AppState = {
  directoryName: readLegacyStorageValue('directory'),
  files: [],
  isFolderSyncInProgress: false,
  lastSyncAt: null,
  userId: readLegacyStorageValue('userId'),
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,
      clearFiles: () => set({ files: [] }),
      clearUserId: () => set({ userId: null }),
      resetFolder: () =>
        set({
          directoryName: null,
          files: [],
          lastSyncAt: null,
        }),
      setDirectoryName: (directoryName) => set({ directoryName }),
      setFiles: (files) => set({ files }),
      setFolderSyncInProgress: (isFolderSyncInProgress) => set({ isFolderSyncInProgress }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      setUserId: (userId) => set({ userId }),
    }),
    {
      name: 'dwnldr-store',
      onRehydrateStorage: () => (state) => {
        state?.setFolderSyncInProgress(false);
      },
      partialize: ({ directoryName, files, lastSyncAt, userId }) => ({
        directoryName,
        files,
        lastSyncAt,
        userId,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
