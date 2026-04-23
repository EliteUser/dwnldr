import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import { apiSlice } from '../api/api.slice';
import filesReducer, { FilesState, setDirectoryName } from './files.slice';
import userReducer, { clearUserId, setUserId } from './user.slice';

const USER_STORAGE_KEY = 'userId';
const DIRECTORY_STORAGE_KEY = 'directory';

const rootReducer = combineReducers({
  user: userReducer,
  files: filesReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

type InitialState = {
  user: {
    userId: string | null;
  };
  files: FilesState;
};

const readStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {}
};

const removeStorageValue = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {}
};

export const loadInitialState = (): InitialState => {
  return {
    user: {
      userId: readStorageValue(USER_STORAGE_KEY),
    },
    files: {
      loading: false,
      files: [],
      directoryName: readStorageValue(DIRECTORY_STORAGE_KEY),
      lastSyncAt: null,
    },
  };
};

const createPersistenceMiddleware = () => {
  const persistenceMiddleware = createListenerMiddleware();

  persistenceMiddleware.startListening({
    actionCreator: setUserId,
    effect: async (action) => {
      writeStorageValue(USER_STORAGE_KEY, action.payload);
    },
  });

  persistenceMiddleware.startListening({
    actionCreator: clearUserId,
    effect: async () => {
      removeStorageValue(USER_STORAGE_KEY);
    },
  });

  persistenceMiddleware.startListening({
    actionCreator: setDirectoryName,
    effect: async (action) => {
      writeStorageValue(DIRECTORY_STORAGE_KEY, action.payload);
    },
  });

  return persistenceMiddleware;
};

export const createAppStore = (preloadedState = loadInitialState()) => {
  const persistenceMiddleware = createPersistenceMiddleware();

  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(persistenceMiddleware.middleware).concat(apiSlice.middleware),
  });
};

export const store = createAppStore();

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
