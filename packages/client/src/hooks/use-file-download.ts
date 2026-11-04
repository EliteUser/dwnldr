import { useCallback, useRef, useState } from 'react';

import { readApiError } from '../api';
import { getDownloadFileName, isAbortError, saveBlob } from '../utils/common';
import { getDownloadFolder, saveToFolder } from '../utils/folder';
import { notify } from '../utils/notify';

/** Posts a form to an endpoint that answers with a file, and saves it to the music folder or the browser downloads. */
export const useFileDownload = (endpoint: string) => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const download = useCallback(
    async (body: FormData, name: string) => {
      const abortController = new AbortController();

      abortControllerRef.current = abortController;
      setInProgress(true);

      try {
        let directory: FileSystemDirectoryHandle | null = null;

        try {
          directory = await getDownloadFolder();
        } catch {
          notify.info('Folder access unavailable. Using browser downloads. Pick the folder again in Settings.');
        }

        const response = await fetch(endpoint, { method: 'POST', body, signal: abortController.signal });

        if (!response.ok) {
          notify.apiError(await readApiError(response));
          return;
        }

        const fileName = getDownloadFileName(response.headers.get('content-disposition'), `${name}.mp3`);
        const blob = await response.blob();

        if (directory) {
          try {
            notify.success(`Saved to ${directory.name}: ${await saveToFolder(directory, fileName, blob)}`);
            return;
          } catch {
            notify.info('Could not write to the selected folder. Using browser downloads instead.');
          }
        }

        saveBlob(fileName, blob);
        notify.success(`Saved: ${name}`);
      } catch (error) {
        if (!isAbortError(error)) {
          notify.error('The download failed. Try again.');
        }
      } finally {
        abortControllerRef.current = null;
        setInProgress(false);
      }
    },
    [endpoint],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    notify.info('Download canceled.');
  }, []);

  return { cancel, download, inProgress };
};
