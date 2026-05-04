import { Accordion, Button, Loader, Text, TextInput } from '@mantine/core';
import { IconBrandSoundcloud, IconBrandYoutube, IconDownload } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useState } from 'react';

import { useGetProviderTrackQuery } from '../../api/api';
import { Artwork } from '../../components/artwork';
import { MetadataFields } from '../../components/metadata-fields';
import type { ArtworkDownloadPayload } from '../../types';
import { getApiErrorFromQueryError, useNotify, DOWNLOAD_NOTIFICATION_NAME } from '../../utils';
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
  const [artwork, setArtwork] = useState<ArtworkDownloadPayload>();

  const notify = useNotify();
  const { cancel, download, inProgress } = useDownload();

  const {
    currentData: track,
    error: metadataError,
    isFetching,
    provider,
  } = useGetProviderTrackQuery(debouncedUrl, {
    skip: !debouncedUrl,
  });

  const trimmedUrl = urlInput.trim();
  const hasUrl = Boolean(trimmedUrl);
  const providerArtworkUrl = track?.artwork?.url ?? track?.artwork_url;

  const isMetadataLoading =
    hasUrl && (trimmedUrl !== debouncedUrl || isFetching || (Boolean(provider) && !track && !metadataError));

  const isEditorReady = hasUrl && !isMetadataLoading && Boolean(track);
  const canDownload = !inProgress && isEditorReady && Boolean(name);

  useEffect(() => {
    setUrlInput(selectedUrl || '');
    setDebouncedUrl(selectedUrl || '');
    setName('');
    setAlbum('');
    setLyrics('');
    setArtwork(undefined);
  }, [selectedUrl]);

  useEffect(() => {
    if (track && !isFetching) {
      setName(provider?.toDownloadName(track) ?? `${track.user} - ${track.title}`);
    }
  }, [provider, track, isFetching]);

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
      setArtwork(undefined);
    }
  }, [debouncedUrl, urlInput]);

  useEffect(() => {
    if (metadataError) {
      notify.apiError(getApiErrorFromQueryError(metadataError), {
        name: DOWNLOAD_NOTIFICATION_NAME.metadataError,
      });
    }
  }, [metadataError, notify]);

  const handleDownload = useCallback(() => {
    void download({
      album,
      artwork,
      lyrics,
      name,
      url: trimmedUrl,
    });
  }, [album, download, name, artwork, lyrics, trimmedUrl]);

  return (
    <div className={styles.download}>
      <section className={styles.sourcePanel}>
        <TextInput
          value={urlInput}
          label='Track URL'
          onChange={(evt) => setUrlInput(evt.target.value)}
          placeholder='Enter track URL'
          loading={isMetadataLoading}
          disabled={isMetadataLoading}
        />
      </section>

      {isMetadataLoading ? (
        <section className={styles.loadingState}>
          <Loader size='lg' />
        </section>
      ) : isEditorReady ? (
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
                  resetKey={debouncedUrl}
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
              onClick={handleDownload}
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
      ) : !hasUrl ? (
        <section className={styles.emptyState}>
          <Text c='dimmed' size='lg'>
            Paste a track URL to start
          </Text>

          <div className={styles.supportedProviders} aria-label='Supported providers'>
            <span className={styles.provider}>
              <IconBrandYoutube size={18} />
              <Text size='sm'>YouTube</Text>
            </span>

            <span className={styles.provider}>
              <IconBrandSoundcloud size={18} />
              <Text size='sm'>SoundCloud</Text>
            </span>
          </div>
        </section>
      ) : (
        <section className={styles.emptyState}>
          <Text c='dimmed' size='lg'>
            Track details could not be loaded.
          </Text>
        </section>
      )}
    </div>
  );
});
