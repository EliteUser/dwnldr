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

const ArtworkContent = (props: Omit<ArtworkProps, 'resetKey'>) => {
  const { disabled, providerArtworkUrl, onArtworkChange } = props;

  const isMountedRef = useRef(true);
  const operationIdRef = useRef(0);
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
    setPreviewUrl(undefined);
  }, []);

  const openEditorWithFile = useCallback(
    async (file: File, operationId: number) => {
      await validateArtworkFile(file);

      if (!isMountedRef.current || operationIdRef.current !== operationId) {
        return;
      }

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
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      operationIdRef.current += 1;
      revokeSourceUrl();
    };
  }, [revokeSourceUrl]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
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
    operationIdRef.current += 1;
    revokePreviewUrl();
    revokeSourceUrl();
    setDraftUrl(undefined);
    setInitialCrop(undefined);
    setOriginalUrl(undefined);
    setError('');
    setIsUrlLoading(false);
    setUrlInput('');
    onArtworkChange(undefined);
  }, [onArtworkChange, revokePreviewUrl, revokeSourceUrl]);

  const handleArtworkFile = useCallback(
    async (file: File) => {
      const operationId = ++operationIdRef.current;
      setIsUrlLoading(false);

      try {
        await openEditorWithFile(file, operationId);
      } catch (validationError) {
        if (isMountedRef.current && operationIdRef.current === operationId) {
          setError(validationError instanceof Error ? validationError.message : 'Invalid artwork file.');
        }
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

    const operationId = ++operationIdRef.current;

    setIsUrlLoading(true);
    setError('');

    try {
      const file = await loadRemoteArtworkFile(trimmedUrlInput);

      await openEditorWithFile(file, operationId);
    } catch (loadError) {
      if (isMountedRef.current && operationIdRef.current === operationId) {
        setError(loadError instanceof Error ? loadError.message : 'Image URL could not be loaded.');
      }
    } finally {
      if (isMountedRef.current && operationIdRef.current === operationId) {
        setIsUrlLoading(false);
      }
    }
  }, [openEditorWithFile, trimmedUrlInput]);

  const handleApply = useCallback(
    (file: File, crop: Crop) => {
      if (!isMountedRef.current) {
        return;
      }

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
                event.preventDefault();

                if (!isUrlLoading) {
                  void handleUrlLoad();
                }
              }
            }}
            placeholder='https://example.com/image.jpg'
          />

          <Button
            size='md'
            variant='outline'
            loading={isUrlLoading}
            disabled={disabled || isUrlLoading || !trimmedUrlInput}
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

      {isEditorOpen && (
        <ArtworkEditor
          key={draftUrl}
          disabled={disabled}
          draftUrl={draftUrl}
          initialCrop={initialCrop}
          visible
          onApply={handleApply}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export const Artwork = memo<ArtworkProps>(({ resetKey, ...props }) => <ArtworkContent key={resetKey} {...props} />);

Artwork.displayName = 'Artwork';
