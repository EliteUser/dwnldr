import { ArrowShapeDownToLine } from '@gravity-ui/icons';
import { TextInput, Button, Icon, TextArea, Label, Progress, Loader } from '@gravity-ui/uikit';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { useGetSoundCloudTracksQuery, useGetYoutubeTracksQuery } from '../../api/api.slice';
import {
  classifySource,
  DOWNLOAD_NOTIFICATION_MESSAGE,
  DOWNLOAD_NOTIFICATION_NAME,
  FALLBACK_API_ERROR_MESSAGE,
  getApiErrorFromRtkError,
  parseApiErrorResponse,
  useNotify,
} from '../../utils';

import styles from './download.module.scss';

type DownloadProps = {
  selectedUrl?: string;
};

const METADATA_DEBOUNCE_MS = 300;

const canUseSaveFilePicker = () =>
  typeof window !== 'undefined' && window.isSecureContext && 'showSaveFilePicker' in window;

const isAbortError = (error: unknown) => (error as { name?: string }).name === 'AbortError';

const getDownloadFileName = (contentDisposition: string | null, fallbackName: string) => {
  if (!contentDisposition) {
    return fallbackName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallbackName;
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);

  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return fallbackName;
};

const triggerBrowserDownload = (fileName: string, chunks: BlobPart[]) => {
  const blob = new Blob(chunks);
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
};

const readResponse = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (value: Uint8Array) => Promise<void> | void,
) => {
  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return;
    }

    if (value) {
      await onChunk(value);
    }
  }
};

export const Download = memo<DownloadProps>(function Download(props) {
  const { selectedUrl } = props;

  const [urlInput, setUrlInput] = useState(selectedUrl || '');
  const [debouncedUrl, setDebouncedUrl] = useState(selectedUrl || '');
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [lyrics, setLyrics] = useState('');

  const [progress, setProgress] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [isProgressKnown, setIsProgressKnown] = useState(false);
  const notify = useNotify();
  const abortControllerRef = useRef<AbortController | null>(null);

  const source = debouncedUrl ? classifySource(debouncedUrl) : null;

  const {
    currentData: soundCloudTrack,
    error: soundCloudTrackError,
    isFetching: isSoundCloudTrackFetching,
  } = useGetSoundCloudTracksQuery(debouncedUrl, {
    skip: !debouncedUrl || source !== 'soundcloud',
  });

  const {
    currentData: youTubeTrack,
    error: youTubeTrackError,
    isFetching: isYouTubeTrackFetching,
  } = useGetYoutubeTracksQuery(debouncedUrl, {
    skip: !debouncedUrl || source !== 'youtube',
  });

  const track = source === 'soundcloud' ? soundCloudTrack : source === 'youtube' ? youTubeTrack : undefined;
  const isFetching = isSoundCloudTrackFetching || isYouTubeTrackFetching;
  const metadataError = soundCloudTrackError ?? youTubeTrackError;

  useEffect(() => {
    setUrlInput(selectedUrl || '');
    setDebouncedUrl(selectedUrl || '');
    setName('');
    setAlbum('');
    setLyrics('');
  }, [selectedUrl]);

  useEffect(() => {
    if (track && !isFetching) {
      setName(`${track.user} - ${track.title}`);
    }
  }, [track, isFetching]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedUrl(urlInput.trim());
    }, METADATA_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [urlInput]);

  useEffect(() => {
    if (!urlInput || urlInput !== debouncedUrl) {
      setName('');
    }
  }, [debouncedUrl, urlInput]);

  useEffect(() => {
    if (metadataError) {
      notify.apiError(getApiErrorFromRtkError(metadataError), {
        name: DOWNLOAD_NOTIFICATION_NAME.metadataError,
      });
    }
  }, [metadataError, notify]);

  const handleDownload = useCallback(async () => {
    if (!urlInput || !name) {
      return;
    }

    const suggestedFileName = `${name}.mp3`;
    let fileHandle: FileSystemFileHandle | null = null;

    try {
      fileHandle = canUseSaveFilePicker()
        ? await window.showSaveFilePicker({
            suggestedName: suggestedFileName,
            types: [
              {
                description: 'Audio',
                accept: {
                  'audio/mpeg': ['.mp3'],
                },
              },
            ],
          })
        : null;
    } catch (error) {
      if (!isAbortError(error)) {
        notify.error(FALLBACK_API_ERROR_MESSAGE, {
          name: DOWNLOAD_NOTIFICATION_NAME.networkError,
        });
      }

      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setInProgress(true);
    setIsProgressKnown(false);
    setProgress(0);

    const body = {
      url: urlInput,
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

      if (fileHandle) {
        const writable = await fileHandle.createWritable();

        try {
          await readResponse(reader, async (value) => {
            await writable.write(value.slice());
            receivedSize += value.length;

            if (hasKnownSize) {
              setProgress((receivedSize / totalSize) * 100);
            }
          });

          await writable.close();
        } catch (error) {
          await writable.abort();
          throw error;
        }
      } else {
        const chunks: BlobPart[] = [];

        await readResponse(reader, (value) => {
          chunks.push(new Uint8Array(value));
          receivedSize += value.length;

          if (hasKnownSize) {
            setProgress((receivedSize / totalSize) * 100);
          }
        });

        triggerBrowserDownload(fileName, chunks);
      }

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
  }, [album, lyrics, name, notify, urlInput]);

  const handleCancelDownload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return (
    <div className={styles.download}>
      <TextInput
        startContent={
          <Label className={styles.label} theme='normal' size='m'>
            URL
          </Label>
        }
        size='xl'
        hasClear
        value={urlInput}
        onChange={(evt) => setUrlInput(evt.target.value)}
        placeholder='Enter track URL'
      />

      <TextInput
        startContent={
          <Label className={styles.label} theme='normal' size='m'>
            Name
          </Label>
        }
        size='xl'
        hasClear
        value={name}
        onChange={(evt) => setName(evt.target.value)}
        placeholder='Track name'
        endContent={
          isFetching ? (
            <div className={styles.loader}>
              <Loader size='s' />
            </div>
          ) : null
        }
      />

      <TextInput
        size='xl'
        hasClear
        value={album}
        onChange={(evt) => setAlbum(evt.target.value)}
        placeholder='Album (optional)'
      />

      <TextArea
        className={styles.textarea}
        size='xl'
        hasClear
        value={lyrics}
        onChange={(evt) => setLyrics(evt.target.value)}
        placeholder='Lyrics (optional)'
        minRows={8}
        controlProps={{ style: { resize: 'vertical' } }}
      />

      <Button
        size='xl'
        view='action'
        loading={inProgress}
        disabled={inProgress || !urlInput || !name}
        onClick={handleDownload}
      >
        <Icon size={16} data={ArrowShapeDownToLine} /> Download
      </Button>

      {inProgress && (
        <div className={styles.actions}>
          <Button size='xl' view='outlined' onClick={handleCancelDownload}>
            Cancel
          </Button>
          <Progress size='xs' theme='info' value={progress} loading={!isProgressKnown} />
        </div>
      )}
    </div>
  );
});
