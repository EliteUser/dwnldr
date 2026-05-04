import { Accordion, Button, CloseButton, Group, Loader, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconCancel, IconDownload, IconMusic, IconUpload } from '@tabler/icons-react';
import { memo, useCallback, useRef, useState } from 'react';

import { Artwork } from '../../components/artwork';
import { MetadataFields } from '../../components/metadata-fields';
import type { ArtworkDownloadPayload } from '../../types';
import { getApiErrorFromQueryError, isAbortError, TRACK_META_NOTIFICATION_NAME, useNotify } from '../../utils';
import { getAudioValidationMessage, inspectAudioFile } from './track-meta.utils';
import { useTrackMetaDownload } from './use-track-meta-download';

import styles from './track-meta.module.scss';

export const TrackMeta = memo(() => {
  const inspectAbortControllerRef = useRef<AbortController | null>(null);
  const inspectRequestIdRef = useRef(0);
  const notify = useNotify();
  const { cancel, download, inProgress } = useTrackMetaDownload();

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

  const handleAudioDrop = useCallback(
    (files: File[]) => {
      const file = files[0];

      if (file) {
        void handleAudioFile(file);
      }
    },
    [handleAudioFile],
  );

  const handleAudioReject = useCallback(() => {
    const validationMessage = 'Use an MP3 audio file.';

    setUploadError(validationMessage);
    notify.error(validationMessage, {
      name: TRACK_META_NOTIFICATION_NAME.invalidAudio,
    });
  }, [notify]);

  const handleRemoveAudio = useCallback(() => {
    inspectAbortControllerRef.current?.abort();
    inspectAbortControllerRef.current = null;
    inspectRequestIdRef.current += 1;
    setAudio(undefined);
    setAlbum('');
    setArtwork(undefined);
    setLyrics('');
    setName('');
    setProviderArtworkUrl(undefined);
    setResetKey('');
    setUploadError('');
    setIsInspecting(false);
  }, []);

  const canDownload = Boolean(audio) && Boolean(name) && !inProgress && !isInspecting;

  return (
    <div className={styles['track-meta']}>
      {!audio && (
        <Dropzone
          aria-label='Upload MP3'
          accept={{
            'audio/mpeg': ['.mp3'],
            'audio/mp3': ['.mp3'],
            'application/octet-stream': ['.mp3'],
          }}
          className={styles.sourcePanel}
          disabled={inProgress || isInspecting}
          maxFiles={1}
          multiple={false}
          onDrop={handleAudioDrop}
          onReject={handleAudioReject}
        >
          <Group justify='center' gap='md' mih={96} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={48} stroke={2} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconCancel size={48} stroke={2} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconMusic size={48} stroke={2} />
            </Dropzone.Idle>

            <div className={styles.dropzonePrompt}>
              <Text fw={600}>Drop MP3 here or click to select</Text>
              <Text size='sm' c='dimmed'>
                MP3 files only.
              </Text>
            </div>
          </Group>

          {uploadError && (
            <Text size='sm' c='red'>
              {uploadError}
            </Text>
          )}
        </Dropzone>
      )}

      {audio && (
        <section className={styles.selectedFilePanel}>
          <div className={styles.selectedFileInfo}>
            <IconMusic size={24} stroke={2} />

            <div>
              <Text fw={600}>Selected file</Text>
              <Text size='sm' c='dimmed'>
                {audio.name}
              </Text>
            </div>
          </div>

          <CloseButton
            aria-label='Remove selected audio file'
            disabled={inProgress}
            size='lg'
            onClick={handleRemoveAudio}
          />
        </section>
      )}

      {isInspecting ? (
        <section className={styles.loadingState}>
          <Loader size='md' />
        </section>
      ) : audio ? (
        <div className={styles.editorLayout}>
          <Accordion
            className={styles.panel}
            defaultValue='metadata'
            variant='unstyled'
            chevronPosition='left'
            chevronIconSize={24}
          >
            <Accordion.Item value='metadata'>
              <Accordion.Control>
                <Text fw={600}>Metadata</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <MetadataFields
                  album={album}
                  lyrics={lyrics}
                  name={name}
                  onAlbumChange={setAlbum}
                  onLyricsChange={setLyrics}
                  onNameChange={setName}
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Accordion
            className={styles.panel}
            defaultValue='cover'
            variant='unstyled'
            chevronPosition='left'
            chevronIconSize={24}
          >
            <Accordion.Item value='cover'>
              <Accordion.Control>
                <Text fw={600}>Cover Image</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Artwork
                  disabled={inProgress}
                  onArtworkChange={setArtwork}
                  providerArtworkUrl={providerArtworkUrl}
                  resetKey={resetKey}
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <section className={styles.submitPanel}>
            <Button
              size='lg'
              variant='gradient'
              fullWidth
              leftSection={<IconDownload size={24} />}
              gradient={{ from: 'violet', to: 'cyan', deg: 220 }}
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
              Download
            </Button>

            {inProgress && (
              <div className={styles.actions}>
                <Button size='lg' variant='outline' onClick={cancel}>
                  Cancel
                </Button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className={styles.emptyState}>
          <Text c='dimmed'>Upload an MP3 to start.</Text>
        </section>
      )}
    </div>
  );
});

TrackMeta.displayName = 'TrackMeta';
