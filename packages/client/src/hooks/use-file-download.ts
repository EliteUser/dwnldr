import { useCallback, useRef, useState } from 'react';

import { readApiError } from '../api';
import { getDownloadFileName, isAbortError, saveBlob } from '../utils/common';
import { notify } from '../utils/notify';

/** Posts a form to an endpoint that answers with a file, and saves that file in the browser. */
export const useFileDownload = (endpoint: string) => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const download = useCallback(
    async (body: FormData, name: string) => {
      const abortController = new AbortController();

      abortControllerRef.current = abortController;
      setInProgress(true);

      try {
        const response = await fetch(endpoint, { method: 'POST', body, signal: abortController.signal });

        if (!response.ok) {
          notify.apiError(await readApiError(response));
          return;
        }

        saveBlob(
          getDownloadFileName(response.headers.get('content-disposition'), `${name}.mp3`),
          await response.blob(),
        );
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
