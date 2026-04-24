import { ArrowShapeDownToLine } from '@gravity-ui/icons';
import { Button, Icon, Label, Loader, Progress, TextArea, TextInput } from '@gravity-ui/uikit';
import { memo, useEffect, useState } from 'react';

import { useGetSoundCloudTracksQuery, useGetYoutubeTracksQuery } from '../../api/api.slice';
import { classifySource } from '../../utils/common.utils';
import { DOWNLOAD_NOTIFICATION_NAME } from '../../utils/notify.constants';
import { getApiErrorFromRtkError, useNotify } from '../../utils/notify.utils';
import { useDownload } from './use-download';

import styles from './download.module.scss';

type DownloadProps = {
  selectedUrl?: string;
};

const METADATA_DEBOUNCE_MS = 300;

export const Download = memo<DownloadProps>(function Download(props) {
  const { selectedUrl } = props;

  const [urlInput, setUrlInput] = useState(selectedUrl || '');
  const [debouncedUrl, setDebouncedUrl] = useState(selectedUrl || '');
  const [name, setName] = useState('');
  const [album, setAlbum] = useState('');
  const [lyrics, setLyrics] = useState('');

  const notify = useNotify();
  const { cancel, download, inProgress, isProgressKnown, progress } = useDownload();
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
        onClick={() =>
          void download({
            album,
            lyrics,
            name,
            url: urlInput,
          })
        }
      >
        <Icon size={16} data={ArrowShapeDownToLine} /> Download
      </Button>

      {inProgress && (
        <div className={styles.actions}>
          <Button size='xl' view='outlined' onClick={cancel}>
            Cancel
          </Button>
          <Progress size='xs' theme='info' value={progress} loading={!isProgressKnown} />
        </div>
      )}
    </div>
  );
});
