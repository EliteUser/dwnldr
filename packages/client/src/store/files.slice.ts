import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { FileData } from '../types';

export type FilesState = {
  loading: boolean;
  files: FileData[];
  directoryName: string | null;
  lastSyncAt: string | null;
};

const initialState: FilesState = {
  loading: false,
  files: [],
  directoryName: null,
  lastSyncAt: null,
};

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setFiles: (state, action: PayloadAction<FileData[]>) => {
      state.files = action.payload;
    },
    clearFiles(state) {
      state.files = [];
    },
    setDirectoryName: (state, action: PayloadAction<string | null>) => {
      state.directoryName = action.payload;
    },
    setLastSyncAt: (state, action: PayloadAction<string | null>) => {
      state.lastSyncAt = action.payload;
    },
  },
});

export const { setLoading, setFiles, clearFiles, setDirectoryName, setLastSyncAt } = filesSlice.actions;
export default filesSlice.reducer;
