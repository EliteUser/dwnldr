import { ArrowShapeDownToLine } from '@gravity-ui/icons';
import { TextInput, Button, Icon, TextArea, Label, Progress, Loader } from '@gravity-ui/uikit';
import { useState, useEffect, memo, useCallback } from 'react';

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

export const Download = memo<DownloadProps>((props) => {
  const { selectedUrl } = props;

  const [url, setUrl] = useState(selectedUrl || '');
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [lyrics, setLyrics] = useState('');

  const [progress, setProgress] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const notify = useNotify();

  const source = url ? classifySource(url) : null;

  const {
    data: soundCloudTrack,
    error: soundCloudTrackError,
    isFetching: isSoundCloudTrackFetching,
  } = useGetSoundCloudTracksQuery(url, {
    skip: !url || source !== 'soundcloud',
  });

  const {
    data: youTubeTrack,
    error: youTubeTrackError,
    isFetching: isYouTubeTrackFetching,
  } = useGetYoutubeTracksQuery(url, {
    skip: !url || source !== 'youtube',
  });

  const track = soundCloudTrack || youTubeTrack;
  const isFetching = isSoundCloudTrackFetching || isYouTubeTrackFetching;
  const metadataError = soundCloudTrackError ?? youTubeTrackError;

  useEffect(() => {
    setUrl(selectedUrl || '');
  }, [selectedUrl]);

  useEffect(() => {
    if (track && !isFetching) {
      setName(`${track.user} - ${track.title}`);
    }
  }, [track, isFetching]);

  useEffect(() => {
    if (metadataError) {
      notify.apiError(getApiErrorFromRtkError(metadataError), {
        name: DOWNLOAD_NOTIFICATION_NAME.metadataError,
      });
    }
  }, [metadataError, notify]);

  const handleDownload = useCallback(async () => {
    if (!url || !name) {
      return;
    }

    setInProgress(true);

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
      });

      if (!response.ok) {
        notify.apiError(await parseApiErrorResponse(response), {
          name: DOWNLOAD_NOTIFICATION_NAME.submitError,
        });
        return;
      }

      const totalSize = parseInt(response.headers.get('content-length') ?? '0');
      const fileName = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `${name}.mp3`;

      const reader = response.body?.getReader();

      if (!reader) {
        notify.error(FALLBACK_API_ERROR_MESSAGE, {
          name: DOWNLOAD_NOTIFICATION_NAME.missingBody,
        });
        return;
      }

      let receivedSize = 0;
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          const blob = new Blob(chunks);
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');

          a.href = downloadUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);
          notify.success(DOWNLOAD_NOTIFICATION_MESSAGE.success(name), {
            name: DOWNLOAD_NOTIFICATION_NAME.success,
          });

          break;
        }

        chunks.push(new Uint8Array(value));
        receivedSize += value.length;

        const percentage = (receivedSize / totalSize) * 100;

        setProgress(percentage);
      }
    } catch {
      notify.error(FALLBACK_API_ERROR_MESSAGE, {
        name: DOWNLOAD_NOTIFICATION_NAME.networkError,
      });
    } finally {
      setInProgress(false);
      setProgress(0);
    }
  }, [album, lyrics, name, notify, url]);

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
        value={url}
        onChange={(evt) => setUrl(evt.target.value)}
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
        disabled={inProgress || !url || !name}
        onClick={handleDownload}
      >
        <Icon size={16} data={ArrowShapeDownToLine} /> Download
      </Button>

      {inProgress && <Progress size='xs' theme='warning' value={progress} />}
    </div>
  );
});
