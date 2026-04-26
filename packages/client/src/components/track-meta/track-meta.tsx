import { ArrowShapeDownToLine, ArrowShapeUpFromLine } from '@gravity-ui/icons';
import { Button, Disclosure, Icon, Loader, Progress, Text, TextArea, TextInput } from '@gravity-ui/uikit';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useId, useRef, useState } from 'react';

import { ApiRequestError } from '../../api/api';
import { Artwork } from '../../components/artwork';
import { FileDropzone } from '../../lib';
import type { ArtworkDownloadPayload } from '../../types';
import { getApiErrorFromQueryError, isAbortError, useNotify, TRACK_META_NOTIFICATION_NAME } from '../../utils';
import { ACCEPTED_AUDIO_INPUT } from './track-meta.constants';
import { getAudioValidationMessage } from './track-meta.utils';
import { useTrackMetaDownload } from './use-track-meta-download';

import styles from './track-meta.module.scss';

type TrackMetaMetadata = {
  album: string;
  artwork: {
    dataUrl: string;
    mimeType: string;
  } | null;
  lyrics: string;
  name: string;
};

const inspectAudioFile = async (audio: File, signal: AbortSignal) => {
  const body = new FormData();

  body.set('audio', audio);

  const response = await fetch('/api/meta/inspect', {
    method: 'POST',
    body,
    signal,
  });

  if (!response.ok) {
    throw new ApiRequestError(await response.json(), response.status);
  }

  return (await response.json()) as TrackMetaMetadata;
};

export const TrackMeta = memo(function TrackMeta() {
  const inputId = useId();
  const inspectAbortControllerRef = useRef<AbortController | null>(null);
  const inspectRequestIdRef = useRef(0);
  const notify = useNotify();
  const { cancel, download, inProgress, isProgressKnown, progress } = useTrackMetaDownload();

  const [album, setAlbum] = useState('');
  const [artwork, setArtwork] = useState<ArtworkDownloadPayload>();
  const [audio, setAudio] = useState<File>();
  const [isInspecting, setIsInspecting] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [name, setName] = useState('');
  const [providerArtworkUrl, setProviderArtworkUrl] = useState<string>();
  const [resetKey, setResetKey] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleAudioFile = useCallback(
    async (file: File) => {
      const validationMessage = getAudioValidationMessage(file);

      if (validationMessage) {
        setUploadError(validationMessage);
        notify.error(validationMessage, {
          name: TRACK_META_NOTIFICATION_NAME.invalidAudio,
        });
        return;
      }

      inspectAbortControllerRef.current?.abort();

      const abortController = new AbortController();
      const requestId = inspectRequestIdRef.current + 1;
      const nextResetKey = `${file.name}:${file.lastModified}:${file.size}`;

      inspectAbortControllerRef.current = abortController;
      inspectRequestIdRef.current = requestId;
      setAudio(file);
      setAlbum('');
      setArtwork(undefined);
      setLyrics('');
      setName('');
      setProviderArtworkUrl(undefined);
      setResetKey(nextResetKey);
      setUploadError('');
      setIsInspecting(true);

      try {
        const metadata = await inspectAudioFile(file, abortController.signal);

        if (inspectRequestIdRef.current !== requestId) {
          return;
        }

        setAlbum(metadata.album);
        setLyrics(metadata.lyrics);
        setName(metadata.name);
        setProviderArtworkUrl(metadata.artwork?.dataUrl);
      } catch (error) {
        if (inspectRequestIdRef.current !== requestId || isAbortError(error)) {
          return;
        }

        notify.apiError(getApiErrorFromQueryError(error), {
          name: TRACK_META_NOTIFICATION_NAME.inspectError,
        });
      } finally {
        if (inspectRequestIdRef.current === requestId) {
          inspectAbortControllerRef.current = null;
          setIsInspecting(false);
        }
      }
    },
    [notify],
  );

  const handleAudioChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (file) {
        void handleAudioFile(file);
      }
    },
    [handleAudioFile],
  );

  const canDownload = Boolean(audio) && Boolean(name) && !inProgress && !isInspecting;

  return (
    <div className={styles['track-meta']}>
      <FileDropzone
        activeHint='Drop MP3 to inspect'
        className={styles.sourcePanel}
        disabled={inProgress || isInspecting}
        idleHint='or drag an MP3 file here'
        idleHintView='inline'
        onFileDrop={handleAudioFile}
      >
        <div className={styles.sectionHeader}>
          <div>
            <Text variant='subheader-2'>Audio File</Text>

            {audio && (
              <Text variant='caption-2' color='secondary'>
                {audio.name}
              </Text>
            )}
          </div>

          {isInspecting && (
            <div className={styles.status}>
              <Loader size='s' />
              <Text variant='caption-2' color='secondary'>
                Reading
              </Text>
            </div>
          )}
        </div>

        <input
          className={styles.input}
          id={inputId}
          type='file'
          accept={ACCEPTED_AUDIO_INPUT}
          disabled={inProgress || isInspecting}
          onChange={handleAudioChange}
        />

        <label className={styles.uploadButton} htmlFor={inProgress || isInspecting ? undefined : inputId}>
          <Icon size={16} data={ArrowShapeUpFromLine} /> Upload MP3
        </label>

        {uploadError && (
          <Text className={styles.error} variant='caption-2' color='danger'>
            {uploadError}
          </Text>
        )}
      </FileDropzone>

      {isInspecting ? (
        <section className={styles.loadingState}>
          <Loader size='m' />
        </section>
      ) : audio ? (
        <div className={styles.editorLayout}>
          <Disclosure
            className={styles.metadataPanel}
            defaultExpanded
            keepMounted
            size='l'
            summary={<Text variant='subheader-2'>Metadata</Text>}
          >
            <Disclosure.Details>
              <div className={styles.fields}>
                <TextInput
                  size='xl'
                  hasClear
                  value={name}
                  onChange={(evt) => setName(evt.target.value)}
                  placeholder='Track name'
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
                  rows={7}
                  controlProps={{ style: { resize: 'vertical' } }}
                />
              </div>
            </Disclosure.Details>
          </Disclosure>

          <Disclosure
            className={styles.sidePanel}
            defaultExpanded
            keepMounted
            size='l'
            summary={<Text variant='subheader-2'>Cover Image</Text>}
          >
            <Disclosure.Details>
              <div className={styles.artwork}>
                <Artwork
                  disabled={inProgress}
                  onArtworkChange={setArtwork}
                  providerArtworkUrl={providerArtworkUrl}
                  resetKey={resetKey}
                />
              </div>
            </Disclosure.Details>
          </Disclosure>

          <section className={styles.submitPanel}>
            <Button
              size='xl'
              view='action'
              width='max'
              loading={inProgress}
              disabled={!canDownload}
              onClick={() =>
                audio &&
                void download({
                  album,
                  artwork,
                  audio,
                  lyrics,
                  name,
                })
              }
            >
              <Icon size={16} data={ArrowShapeDownToLine} /> Download
            </Button>

            {inProgress && (
              <div className={styles.actions}>
                <Progress size='xs' theme='info' value={progress} loading={!isProgressKnown} />
                <Button size='xl' view='outlined' onClick={cancel}>
                  Cancel
                </Button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className={styles.emptyState}>
          <Text variant='body-2' color='secondary'>
            Upload an MP3 to start.
          </Text>
        </section>
      )}
    </div>
  );
});
