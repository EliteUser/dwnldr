import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileData } from '../types';

export type FilesState = {
    loading: boolean;
    files: FileData[];
    directoryName: string | null;
};

const initialState: FilesState = {
    loading: false,
    files: [],
    directoryName: localStorage.getItem('directory'),
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
        setDirectoryName: (state, action: PayloadAction<string>) => {
            state.directoryName = action.payload;
            localStorage.setItem('directory', action.payload);
        },
    },
});

export const { setLoading, setFiles, clearFiles, setDirectoryName } = filesSlice.actions;
export default filesSlice.reducer;
