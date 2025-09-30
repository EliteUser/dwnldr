import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileData } from '../utils';

type FilesState = {
    folder: string | null;
    files: FileData[] | null;
};

const initialState: FilesState = {
    folder: null,
    files: null,
};

const filesSlice = createSlice({
    name: 'files',
    initialState,
    reducers: {
        setFolder: (state, action: PayloadAction<string>) => {
            state.folder = action.payload;
        },
        setFiles: (state, action: PayloadAction<FileData[]>) => {
            state.files = action.payload;
            localStorage.setItem('files', JSON.stringify(action.payload));
        },
    },
});

export const { setFolder, setFiles } = filesSlice.actions;
export default filesSlice.reducer;
