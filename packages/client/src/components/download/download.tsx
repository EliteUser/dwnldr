import { ArrowShapeDownToLine } from '@gravity-ui/icons';
import { Button, Disclosure, Icon, Loader, Progress, Text, TextArea, TextInput } from '@gravity-ui/uikit';
import { memo, useEffect, useState } from 'react';

import { useGetProviderTrackQuery } from '../../api/api';
import { Artwork } from '../../components/artwork';
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
  const { cancel, download, inProgress, isProgressKnown, progress } = useDownload();

  const {
    currentData: track,
    error: metadataError,
    isFetching,
    provider,
  } = useGetProviderTrackQuery(debouncedUrl, {
    skip: !debouncedUrl,
  });

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

  const trimmedUrl = urlInput.trim();
  const hasUrl = Boolean(trimmedUrl);
  const providerArtworkUrl = track?.artwork?.url ?? track?.artwork_url;

  const isMetadataLoading =
    hasUrl && (trimmedUrl !== debouncedUrl || isFetching || (Boolean(provider) && !track && !metadataError));

  const isEditorReady = hasUrl && !isMetadataLoading && Boolean(track);
  const canDownload = !inProgress && isEditorReady && Boolean(name);

  return (
    <div className={styles.download}>
      <section className={styles.sourcePanel}>
        <div className={styles.sectionHeader}>
          <Text variant='subheader-2'>Track URL</Text>

          {isFetching && (
            <div className={styles.status}>
              <Loader size='s' />
              <Text variant='caption-2' color='secondary'>
                Loading
              </Text>
            </div>
          )}
        </div>

        <TextInput
          size='xl'
          hasClear
          value={urlInput}
          onChange={(evt) => setUrlInput(evt.target.value)}
          placeholder='Enter track URL'
        />
      </section>

      {isMetadataLoading ? (
        <section className={styles.loadingState}>
          <Loader size='m' />
        </section>
      ) : isEditorReady ? (
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
                  minRows={7}
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
                  resetKey={debouncedUrl}
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
                void download({
                  album,
                  artwork,
                  lyrics,
                  name,
                  url: trimmedUrl,
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
      ) : !hasUrl ? (
        <section className={styles.emptyState}>
          <Text variant='body-2' color='secondary'>
            Paste a track URL to start.
          </Text>
        </section>
      ) : (
        <section className={styles.emptyState}>
          <Text variant='body-2' color='secondary'>
            Track details could not be loaded.
          </Text>
        </section>
      )}
    </div>
  );
});
