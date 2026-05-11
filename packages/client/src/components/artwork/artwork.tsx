import { ActionIcon, Badge, Button, Group, Text, TextInput } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconCancel, IconCrop, IconLink, IconPhoto, IconPhotoOff, IconRotate, IconUpload } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Crop } from 'react-image-crop';

import { getProxiedImageUrl } from '../../utils';
import { ArtworkEditor } from '../artwork-editor';
import type { ArtworkProps } from './artwork.types';
import { loadRemoteArtworkFile, validateArtworkFile } from './artwork.utils';

import styles from './artwork.module.scss';

export const Artwork = memo<ArtworkProps>((props) => {
  const { disabled, providerArtworkUrl, resetKey, onArtworkChange } = props;

  const sourceUrlRef = useRef<string | undefined>(undefined);

  const [draftUrl, setDraftUrl] = useState<string>();
  const [error, setError] = useState('');
  const [initialCrop, setInitialCrop] = useState<Crop>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [urlInput, setUrlInput] = useState('');

  const isChanged = Boolean(previewUrl);
  const trimmedUrlInput = urlInput.trim();
  const providerPreviewUrl = getProxiedImageUrl(providerArtworkUrl);
  const visiblePreviewUrl = previewUrl ?? providerPreviewUrl ?? undefined;
  const artworkStatus = isChanged ? 'Custom' : providerArtworkUrl ? 'Default' : 'No artwork';

  const revokeSourceUrl = useCallback(() => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = undefined;
    }
  }, []);

  const revokePreviewUrl = useCallback(() => {
    setPreviewUrl((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }

      return undefined;
    });
  }, []);

  const openEditorWithFile = useCallback(
    async (file: File) => {
      await validateArtworkFile(file);
      revokeSourceUrl();

      const objectUrl = URL.createObjectURL(file);

      sourceUrlRef.current = objectUrl;
      setDraftUrl(objectUrl);
      setInitialCrop(undefined);
      setOriginalUrl(objectUrl);
      setError('');
      setIsEditorOpen(true);
    },
    [revokeSourceUrl],
  );

  useEffect(() => {
    revokePreviewUrl();
    revokeSourceUrl();
    setDraftUrl(providerPreviewUrl || undefined);
    setInitialCrop(undefined);
    setOriginalUrl(providerPreviewUrl || undefined);
    setError('');
    setIsEditorOpen(false);
    setIsUrlLoading(false);
    setUrlInput('');
    onArtworkChange(undefined);
  }, [onArtworkChange, providerPreviewUrl, resetKey, revokePreviewUrl, revokeSourceUrl]);

  useEffect(
    () => () => {
      revokePreviewUrl();
      revokeSourceUrl();
    },
    [revokePreviewUrl, revokeSourceUrl],
  );

  const handleOpen = useCallback(() => {
    setDraftUrl(originalUrl ?? visiblePreviewUrl);
    setError('');
    setIsEditorOpen(true);
  }, [originalUrl, visiblePreviewUrl]);

  const handleClose = useCallback(() => {
    setDraftUrl(originalUrl ?? visiblePreviewUrl);
    setError('');
    setIsEditorOpen(false);
  }, [originalUrl, visiblePreviewUrl]);

  const handleReset = useCallback(() => {
    revokePreviewUrl();
    revokeSourceUrl();
    setDraftUrl(providerPreviewUrl || undefined);
    setInitialCrop(undefined);
    setOriginalUrl(providerPreviewUrl || undefined);
    setError('');
    setUrlInput('');
    onArtworkChange(undefined);
  }, [onArtworkChange, providerPreviewUrl, revokePreviewUrl, revokeSourceUrl]);

  const handleArtworkFile = useCallback(
    async (file: File) => {
      try {
        await openEditorWithFile(file);
      } catch (validationError) {
        setError(validationError instanceof Error ? validationError.message : 'Invalid artwork file.');
      }
    },
    [openEditorWithFile],
  );

  const handleArtworkDrop = useCallback(
    (files: File[]) => {
      const file = files[0];

      if (file) {
        void handleArtworkFile(file);
      }
    },
    [handleArtworkFile],
  );

  const handleArtworkReject = useCallback(() => {
    setError('Use a JPG, PNG, or WEBP image.');
  }, []);

  const handleUrlLoad = useCallback(async () => {
    if (!trimmedUrlInput) {
      setError('Enter an image URL.');
      return;
    }

    setIsUrlLoading(true);
    setError('');

    try {
      const file = await loadRemoteArtworkFile(trimmedUrlInput);

      await openEditorWithFile(file);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Image URL could not be loaded.');
    } finally {
      setIsUrlLoading(false);
    }
  }, [openEditorWithFile, trimmedUrlInput]);

  const handleApply = useCallback(
    (file: File, crop: Crop) => {
      revokePreviewUrl();

      const objectUrl = URL.createObjectURL(file);

      setInitialCrop(crop);
      setPreviewUrl(objectUrl);
      onArtworkChange({
        file,
        source: 'custom',
      });
      setError('');
      setIsEditorOpen(false);
    },
    [onArtworkChange, revokePreviewUrl],
  );

  return (
    <div className={styles.artwork}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Badge size='sm' color={isChanged ? 'indigo' : providerArtworkUrl ? 'gray' : 'violet'}>
            {artworkStatus}
          </Badge>

          <div className={styles.controls}>
            {isChanged && (
              <ActionIcon
                aria-label='Reset artwork'
                title='Reset artwork'
                size='md'
                variant='subtle'
                disabled={disabled}
                onClick={handleReset}
              >
                <IconRotate size={16} />
              </ActionIcon>
            )}

            {visiblePreviewUrl && (
              <ActionIcon
                aria-label='Crop artwork'
                title='Crop artwork'
                size='md'
                variant='outline'
                disabled={disabled}
                onClick={handleOpen}
              >
                <IconCrop size={16} />
              </ActionIcon>
            )}
          </div>
        </div>

        <div className={styles.preview}>
          {visiblePreviewUrl ? (
            <img src={visiblePreviewUrl} alt='Artwork preview' />
          ) : (
            <div className={styles.previewEmpty}>
              <IconPhotoOff size={24} stroke={2} />
              <Text size='sm' c='dimmed'>
                No artwork selected
              </Text>
            </div>
          )}
        </div>
      </div>

      <Dropzone
        aria-label='Upload image'
        accept={{
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'image/webp': ['.webp'],
        }}
        className={styles.dropzone}
        disabled={disabled}
        maxFiles={1}
        multiple={false}
        onDrop={handleArtworkDrop}
        onReject={handleArtworkReject}
      >
        <Group justify='center' gap='md' style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={24} stroke={2} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconCancel size={24} stroke={2} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={24} stroke={2} />
          </Dropzone.Idle>

          <div className={styles.dropzonePrompt}>
            <Text>Drop image here or click to select</Text>

            <Text size='xs' c='dimmed'>
              JPG, PNG, or WEBP.
            </Text>
          </div>
        </Group>
      </Dropzone>

      <div className={styles.sourceControls}>
        <div className={styles.divider}>
          <span />
          <Text size='sm' c='dimmed'>
            or
          </Text>
          <span />
        </div>

        <div className={styles.urlControls}>
          <TextInput
            size='md'
            value={urlInput}
            disabled={disabled || isUrlLoading}
            leftSection={<IconLink size={16} />}
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleUrlLoad();
              }
            }}
            placeholder='https://example.com/image.jpg'
          />

          <Button
            size='md'
            variant='outline'
            loading={isUrlLoading}
            disabled={disabled || !trimmedUrlInput}
            onClick={() => void handleUrlLoad()}
          >
            Load URL
          </Button>
        </div>

        {error && (
          <Text className={styles.error} size='sm' c='red'>
            {error}
          </Text>
        )}
      </div>

      <ArtworkEditor
        disabled={disabled}
        draftUrl={draftUrl}
        initialCrop={initialCrop}
        visible={isEditorOpen}
        onApply={handleApply}
        onClose={handleClose}
      />
    </div>
  );
});

Artwork.displayName = 'Artwork';
