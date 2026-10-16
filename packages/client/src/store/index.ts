import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AppStore, PersistedAppState } from './store.types';
import { sanitizePersistedAppState } from './store.utils';

export type { AppStore } from './store.types';

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

const removeLegacyStorageValue = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures; the persisted store migration still removes old fields.
  }
};

const initialState: PersistedAppState = {
  directoryName: readLegacyStorageValue('directory'),
  files: [],
  lastSyncAt: null,
  profileUrl: null,
};

const initialAppState = {
  ...initialState,
  isFolderSyncInProgress: false,
};

const migratePersistedState = (persistedState: unknown, version: number): PersistedAppState => {
  removeLegacyStorageValue('userId');

  return sanitizePersistedAppState(persistedState, initialState, { clearProfileUrl: version < 1 });
};

removeLegacyStorageValue('userId');

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialAppState,
      clearFiles: () => set({ files: [] }),
      clearProfileUrl: () => set({ profileUrl: null }),
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
      setProfileUrl: (profileUrl) => set({ profileUrl }),
    }),
    {
      name: 'dwnldr-store',
      merge: (persistedState, currentState) => {
        const sanitizedState = sanitizePersistedAppState(persistedState, currentState);

        return {
          ...currentState,
          directoryName: sanitizedState.directoryName,
          files: sanitizedState.files,
          lastSyncAt: sanitizedState.lastSyncAt,
          profileUrl: sanitizedState.profileUrl,
        };
      },
      onRehydrateStorage: () => (state) => {
        removeLegacyStorageValue('userId');
        state?.setFolderSyncInProgress(false);
      },
      partialize: ({ directoryName, files, lastSyncAt, profileUrl }) => ({
        directoryName,
        files,
        lastSyncAt,
        profileUrl,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: migratePersistedState,
    },
  ),
);
