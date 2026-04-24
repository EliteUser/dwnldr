import { useCallback, useRef, useState } from 'react';

import { getDownloadFileName, readResponse, triggerBrowserDownload } from '../../utils/download/download.utils';
import {
  DOWNLOAD_NOTIFICATION_MESSAGE,
  DOWNLOAD_NOTIFICATION_NAME,
  FALLBACK_API_ERROR_MESSAGE,
} from '../../utils/notify/notify.constants';
import { parseApiErrorResponse, useNotify } from '../../utils/notify/notify.utils';

type DownloadInput = {
  album?: string;
  lyrics?: string;
  name: string;
  url: string;
};

const isAbortError = (error: unknown) => (error as { name?: string }).name === 'AbortError';

export const useDownload = () => {
  const notify = useNotify();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progress, setProgress] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [isProgressKnown, setIsProgressKnown] = useState(false);

  const download = useCallback(
    async ({ album, lyrics, name, url }: DownloadInput) => {
      if (!url || !name) {
        return;
      }

      const suggestedFileName = `${name}.mp3`;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setInProgress(true);
      setIsProgressKnown(false);
      setProgress(0);

      const body = {
        url,
        name,
        ...(album && { album }),
        ...(lyrics && { lyrics }),
      };

      try {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/octet-stream',
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (!response.ok) {
          notify.apiError(await parseApiErrorResponse(response), {
            name: DOWNLOAD_NOTIFICATION_NAME.submitError,
          });
          return;
        }

        const reader = response.body?.getReader();
        const fileName = getDownloadFileName(response.headers.get('content-disposition'), suggestedFileName);

        if (!reader) {
          notify.error(FALLBACK_API_ERROR_MESSAGE, {
            name: DOWNLOAD_NOTIFICATION_NAME.missingBody,
          });
          return;
        }

        const totalSize = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
        const hasKnownSize = Number.isFinite(totalSize) && totalSize > 0;

        let receivedSize = 0;
        setIsProgressKnown(hasKnownSize);

        const chunks: BlobPart[] = [];

        await readResponse(reader, (value) => {
          chunks.push(new Uint8Array(value));
          receivedSize += value.length;

          if (hasKnownSize) {
            setProgress((receivedSize / totalSize) * 100);
          }
        });

        triggerBrowserDownload(fileName, chunks);

        notify.success(DOWNLOAD_NOTIFICATION_MESSAGE.success(name), {
          name: DOWNLOAD_NOTIFICATION_NAME.success,
        });
      } catch (error) {
        if (!isAbortError(error)) {
          notify.error(FALLBACK_API_ERROR_MESSAGE, {
            name: DOWNLOAD_NOTIFICATION_NAME.networkError,
          });
        }
      } finally {
        abortControllerRef.current = null;
        setInProgress(false);
        setProgress(0);
        setIsProgressKnown(false);
      }
    },
    [notify],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    cancel,
    download,
    inProgress,
    isProgressKnown,
    progress,
  };
};
