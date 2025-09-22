import { FileData, getFileData } from './common.utils.ts';

const DB_NAME = 'file-handles';
const STORE_NAME = 'handles';
const KEY = 'music';

/**
 * Save directory handle to IndexedDB
 */
const saveHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(handle, KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        };

        request.onerror = (e) => reject(e);
    });
};

/**
 * Load directory handle from IndexedDB
 */
const loadHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(STORE_NAME, 'readonly');
            const getReq = tx.objectStore(STORE_NAME).get(KEY);

            getReq.onsuccess = () => {
                resolve((getReq.result as FileSystemDirectoryHandle) || null);
            };
            getReq.onerror = (e) => reject(e);
        };

        request.onerror = (e) => reject(e);
    });
};

/**
 * Ask user to pick a folder and save it
 */
export const pickMusicFolder = async (): Promise<FileSystemDirectoryHandle> => {
    const dirHandle = await window.showDirectoryPicker();
    await saveHandle(dirHandle);

    return dirHandle;
};

/**
 * Scan flat folder and return list of file names
 */
export const getMusicFiles = async (): Promise<FileData[]> => {
    try {
        const dirHandle = await loadHandle();

        if (!dirHandle) {
            return [];
        }

        let perm = await dirHandle.queryPermission({ mode: 'read' });

        if (perm !== 'granted') {
            perm = await dirHandle.requestPermission({ mode: 'read' });

            if (perm !== 'granted') {
                console.error('Permission denied.');
            }
        }

        const files: FileData[] = [];

        for await (const handle of dirHandle.values()) {
            if (handle.kind === 'file') {
                const file = await handle.getFile();

                files.push(getFileData(file));
            }
        }

        return files;
    } catch (err) {
        console.error(err);
        return [];
    }
};
