import { store } from '../store';

import { loadDirectoryHandle, saveDirectoryHandle } from './directory-handle.utils';
import { clearFiles, setDirectoryName, setFiles, setLoading } from '../store/files.slice';
import { FileData } from '../types';
import { getFileData } from './common.utils.ts';

const verifyPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
    if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
        return true;
    } else if ((await handle.requestPermission({ mode: 'read' })) === 'granted') {
        return true;
    }

    return false;
};

export const handleSyncFolder = async () => {
    try {
        store.dispatch(setLoading(true));
        store.dispatch(clearFiles());

        let dirHandle: FileSystemDirectoryHandle | null;

        /* Try to restore from IndexedDB first */
        const savedHandle = await loadDirectoryHandle();

        if (savedHandle && (await verifyPermission(savedHandle))) {
            /* Permission still granted → reuse */
            dirHandle = savedHandle;
        } else {
            return;
        }

        const fileList: FileData[] = [];
        for await (const fileName of dirHandle.keys()) {
            fileList.push(getFileData(fileName));
        }

        store.dispatch(setFiles(fileList));
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Error selecting folder:', err);
        }
    } finally {
        store.dispatch(setLoading(false));
    }
};

export const handleSelectFolder = async () => {
    try {
        const dirHandle = await window.showDirectoryPicker();

        await saveDirectoryHandle(dirHandle);

        store.dispatch(setDirectoryName(dirHandle.name));

        await handleSyncFolder();
    } catch (err: any) {
        console.error('Error picking folder', err);
    }
};
