import { ArrowRotateLeft, ArrowShapeUpFromLine, Link, Pencil } from '@gravity-ui/icons';
import { Button, Icon, SegmentedRadioGroup, Text, TextInput } from '@gravity-ui/uikit';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Crop } from 'react-image-crop';

import { FileDropzone } from '../../lib';
import { ArtworkEditor } from '../artwork-editor';
import { ACCEPTED_ARTWORK_INPUT, ARTWORK_SOURCE_OPTIONS } from './artwork.constants';
import type { ArtworkProps, ArtworkSourceMode } from './artwork.types';
import { loadRemoteArtworkFile, validateArtworkFile } from './artwork.utils';

import styles from './artwork.module.scss';

export const Artwork = memo<ArtworkProps>((props) => {
  const { disabled, providerArtworkUrl, resetKey, onArtworkChange } = props;

  const inputId = useId();
  const sourceUrlRef = useRef<string | undefined>(undefined);

  const [draftUrl, setDraftUrl] = useState<string>();
  const [error, setError] = useState('');
  const [initialCrop, setInitialCrop] = useState<Crop>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [sourceMode, setSourceMode] = useState<ArtworkSourceMode>('file');
  const [urlInput, setUrlInput] = useState('');

  const isChanged = Boolean(previewUrl);
  const trimmedUrlInput = urlInput.trim();
  const visiblePreviewUrl = previewUrl ?? providerArtworkUrl ?? undefined;

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
    setDraftUrl(providerArtworkUrl ?? undefined);
    setInitialCrop(undefined);
    setOriginalUrl(providerArtworkUrl ?? undefined);
    setError('');
    setIsEditorOpen(false);
    setIsUrlLoading(false);
    setSourceMode('file');
    setUrlInput('');
    onArtworkChange(undefined);
  }, [onArtworkChange, providerArtworkUrl, resetKey, revokePreviewUrl, revokeSourceUrl]);

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
    setDraftUrl(providerArtworkUrl ?? undefined);
    setInitialCrop(undefined);
    setOriginalUrl(providerArtworkUrl ?? undefined);
    setError('');
    setUrlInput('');
    onArtworkChange(undefined);
  }, [onArtworkChange, providerArtworkUrl, revokePreviewUrl, revokeSourceUrl]);

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

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (file) {
        void handleArtworkFile(file);
      }
    },
    [handleArtworkFile],
  );

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
      <div className={styles.previewRow}>
        <FileDropzone
          activeHint='Drop image to crop'
          className={styles.preview}
          disabled={disabled}
          onFileDrop={handleArtworkFile}
        >
          {visiblePreviewUrl ? (
            <img src={visiblePreviewUrl} alt='' />
          ) : (
            <div className={styles.previewEmpty}>
              <Icon size={20} data={ArrowShapeUpFromLine} />
              <Text variant='body-1'>Drop image here</Text>
              <Text variant='caption-2' color='secondary'>
                JPEG, PNG, or WebP
              </Text>
            </div>
          )}
        </FileDropzone>

        <div className={styles.summary}>
          <Text className={styles.summaryTitle} variant='body-1'>
            {isChanged ? 'Custom artwork' : providerArtworkUrl ? 'Default artwork' : 'No artwork'}
          </Text>

          <Text variant='caption-2' color='secondary'>
            {visiblePreviewUrl
              ? 'Drop a new image on the preview to replace it.'
              : 'Upload an image or paste an image URL.'}
          </Text>

          <div className={styles.controls}>
            {visiblePreviewUrl && (
              <Button size='m' view='outlined' disabled={disabled} onClick={handleOpen}>
                <Icon size={16} data={Pencil} /> Edit
              </Button>
            )}

            {isChanged && (
              <Button size='m' view='flat-secondary' disabled={disabled} onClick={handleReset}>
                <Icon size={16} data={ArrowRotateLeft} /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.sourceControls}>
        <SegmentedRadioGroup
          size='m'
          value={sourceMode}
          options={ARTWORK_SOURCE_OPTIONS}
          disabled={disabled || isUrlLoading}
          onUpdate={setSourceMode}
        />

        {sourceMode === 'file' ? (
          <div>
            <input
              className={styles.input}
              id={inputId}
              type='file'
              accept={ACCEPTED_ARTWORK_INPUT}
              onChange={(event) => void handleFileChange(event)}
            />

            <label className={styles.uploadButton} htmlFor={disabled ? undefined : inputId}>
              <Icon size={16} data={ArrowShapeUpFromLine} /> Upload image
            </label>
          </div>
        ) : (
          <div className={styles.urlControls}>
            <TextInput
              size='m'
              hasClear
              value={urlInput}
              disabled={disabled || isUrlLoading}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleUrlLoad();
                }
              }}
              placeholder='Image URL'
            />

            <Button
              size='m'
              view='outlined'
              loading={isUrlLoading}
              disabled={disabled || !trimmedUrlInput}
              onClick={() => void handleUrlLoad()}
            >
              <Icon size={16} data={Link} /> Load
            </Button>
          </div>
        )}

        {error && (
          <Text className={styles.error} variant='caption-2' color='danger'>
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
