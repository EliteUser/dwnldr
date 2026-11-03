import { Accordion, Button, Loader, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconBrandSoundcloud, IconBrandYoutube, IconDownload, IconLink } from '@tabler/icons-react';
import { memo, useEffect, useState } from 'react';

import { useProviders, useTrack } from '../../api';
import { useFileDownload } from '../../hooks/use-file-download';
import { notify } from '../../utils/notify';
import { Artwork } from '../artwork/artwork';
import { MetadataFields } from '../metadata-fields/metadata-fields';

import styles from './download.module.scss';

type DownloadProps = {
  selectedUrl?: string;
};

const METADATA_DEBOUNCE_MS = 300;

const PROVIDER_ICONS: Record<string, typeof IconLink> = {
  soundcloud: IconBrandSoundcloud,
  youtube: IconBrandYoutube,
};

type DownloadFormProps = DownloadProps & {
  fileDownload: ReturnType<typeof useFileDownload>;
};

const DownloadForm = ({ fileDownload, selectedUrl }: DownloadFormProps) => {
  const [urlInput, setUrlInput] = useState(selectedUrl ?? '');
  const [nameOverride, setNameOverride] = useState<string>();
  const [album, setAlbum] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [artwork, setArtwork] = useState<File>();

  const { cancel, download, inProgress } = fileDownload;
  const { data: providers } = useProviders();
  const trimmedUrl = urlInput.trim();
  const [pacedUrl] = useDebouncedValue(trimmedUrl, METADATA_DEBOUNCE_MS);
  // A link opened from Likes or a share is ready immediately; typed links wait for the debounce.
  const debouncedUrl = selectedUrl && urlInput === selectedUrl ? selectedUrl : pacedUrl;
  const { data: track, error: metadataError, isFetching } = useTrack(debouncedUrl);

  const hasUrl = Boolean(trimmedUrl);
  const isMetadataLoading = hasUrl && (trimmedUrl !== debouncedUrl || isFetching);
  const isEditorReady = hasUrl && !isMetadataLoading && Boolean(track);
  const name = nameOverride ?? (track ? `${track.artist} - ${track.title}` : '');
  const canDownload = !inProgress && isEditorReady && Boolean(name);

  useEffect(() => {
    if (metadataError) {
      notify.apiError(metadataError);
    }
  }, [metadataError]);

  const handleDownload = () => {
    const body = new FormData();

    body.set('url', trimmedUrl);
    body.set('name', name);

    if (album) {
      body.set('album', album);
    }

    if (lyrics) {
      body.set('lyrics', lyrics);
    }

    if (artwork) {
      body.set('artwork', artwork);
    }

    void download(body, name);
  };

  const handleUrlChange = (nextUrl: string) => {
    setUrlInput(nextUrl);
    setNameOverride(undefined);
    setAlbum('');
    setLyrics('');
    setArtwork(undefined);
  };

  return (
    <div className={styles.download}>
      <section className={styles.sourcePanel}>
        <TextInput
          value={urlInput}
          label='Track URL'
          onChange={(evt) => handleUrlChange(evt.target.value)}
          placeholder='Enter track URL'
          loading={isMetadataLoading}
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
                  onNameChange={setNameOverride}
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
                  providerArtworkUrl={track?.artworkUrl}
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
          </section>
        </div>
      ) : !hasUrl ? (
        <section className={styles.emptyState}>
          <Text c='dimmed' size='lg'>
            Paste a track URL to start
          </Text>

          <div className={styles.supportedProviders} aria-label='Supported providers'>
            {providers?.map(({ key, label }) => {
              const Icon = PROVIDER_ICONS[key] ?? IconLink;

              return (
                <span key={key} className={styles.provider}>
                  <Icon size={18} />
                  <Text size='sm'>{label}</Text>
                </span>
              );
            })}
          </div>
        </section>
      ) : (
        <section className={styles.emptyState}>
          <Text c='dimmed' size='lg'>
            Track details could not be loaded.
          </Text>
        </section>
      )}

      {inProgress && (
        <div className={styles.actions}>
          <Button size='lg' variant='outline' onClick={cancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export const Download = memo<DownloadProps>(({ selectedUrl }) => {
  // Lives outside the keyed form so a running download survives picking another track.
  const fileDownload = useFileDownload('/api/download');

  return <DownloadForm key={selectedUrl ?? ''} fileDownload={fileDownload} selectedUrl={selectedUrl} />;
});

Download.displayName = 'Download';
