import { useCallback, useRef, useState } from 'react';

import type { ArtworkDownloadPayload } from '../../types';
import {
  isAbortError,
  getDownloadFileName,
  readResponse,
  triggerBrowserDownload,
  FALLBACK_API_ERROR_MESSAGE,
  parseApiErrorResponse,
  TRACK_META_NOTIFICATION_MESSAGE,
  TRACK_META_NOTIFICATION_NAME,
  useNotify,
} from '../../utils';

type TrackMetaDownloadInput = {
  album?: string;
  artwork?: ArtworkDownloadPayload;
  audio: File;
  lyrics?: string;
  name: string;
};

export const useTrackMetaDownload = () => {
  const notify = useNotify();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progress, setProgress] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [isProgressKnown, setIsProgressKnown] = useState(false);

  const download = useCallback(
    async ({ album, artwork, audio, lyrics, name }: TrackMetaDownloadInput) => {
      if (!audio || !name) {
        return;
      }

      const suggestedFileName = `${name}.mp3`;
      const abortController = new AbortController();
      const body = new FormData();

      body.set('audio', audio);
      body.set('name', name);
      body.set('album', album ?? '');

      if (lyrics) {
        body.set('lyrics', lyrics);
      }

      if (artwork?.source === 'custom') {
        body.set('artworkSource', 'custom');
        body.set('artwork', artwork.file);
      }

      abortControllerRef.current = abortController;

      setInProgress(true);
      setIsProgressKnown(false);
      setProgress(0);

      try {
        const response = await fetch('/api/meta/download', {
          method: 'POST',
          headers: {
            Accept: 'application/octet-stream',
          },
          body,
          signal: abortController.signal,
        });

        if (!response.ok) {
          notify.apiError(await parseApiErrorResponse(response), {
            name: TRACK_META_NOTIFICATION_NAME.submitError,
          });
          return;
        }

        const reader = response.body?.getReader();
        const fileName = getDownloadFileName(response.headers.get('content-disposition'), suggestedFileName);

        if (!reader) {
          notify.error(FALLBACK_API_ERROR_MESSAGE, {
            name: TRACK_META_NOTIFICATION_NAME.missingBody,
          });
          return;
        }

        const totalSize = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
        const hasKnownSize = Number.isFinite(totalSize) && totalSize > 0;
        const chunks: BlobPart[] = [];
        let receivedSize = 0;

        setIsProgressKnown(hasKnownSize);

        await readResponse(reader, (value) => {
          chunks.push(new Uint8Array(value));
          receivedSize += value.length;

          if (hasKnownSize) {
            setProgress((receivedSize / totalSize) * 100);
          }
        });

        triggerBrowserDownload(fileName, chunks);

        notify.success(TRACK_META_NOTIFICATION_MESSAGE.success(name), {
          name: TRACK_META_NOTIFICATION_NAME.success,
        });
      } catch (error) {
        if (!isAbortError(error)) {
          notify.error(FALLBACK_API_ERROR_MESSAGE, {
            name: TRACK_META_NOTIFICATION_NAME.networkError,
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
    const abortController = abortControllerRef.current;

    if (!abortController) {
      return;
    }

    abortController.abort();
    notify.info(TRACK_META_NOTIFICATION_MESSAGE.cancelled, {
      name: TRACK_META_NOTIFICATION_NAME.cancelled,
    });
  }, [notify]);

  return {
    cancel,
    download,
    inProgress,
    isProgressKnown,
    progress,
  };
};
