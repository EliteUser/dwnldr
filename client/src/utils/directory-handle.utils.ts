const DB_NAME = 'dwnldr-app';
const DB_VERSION = 1;
const STORE_NAME = 'dwnldr';
const HANDLE_KEY = 'folderHandle';

let db: IDBDatabase | null = null;

/**
 * Open or create Indexed DB Object
 */
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (evt) => {
            const database = (evt.target as IDBOpenDBRequest).result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };
    });
};

/**
 * Save directory handle to IndexedDB
 */
export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
    const database = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, HANDLE_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Load directory handle from IndexedDB
 */
export const loadDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
    try {
        const database = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(HANDLE_KEY);

            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('Failed to load handle from IndexedDB:', err);
        return null;
    }
};

export const clearDirectoryHandle = async (): Promise<void> => {
    const database = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(HANDLE_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
