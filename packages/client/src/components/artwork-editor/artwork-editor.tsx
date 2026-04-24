import type { ArtworkEditorProps } from './artwork-editor.types';
import type { Crop, PixelCrop } from 'react-image-crop';

import { ArrowRotateLeft, ArrowShapeUpFromLine, Pencil } from '@gravity-ui/icons';
import { Button, Icon, Sheet, Text } from '@gravity-ui/uikit';
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import ReactCrop, { convertToPixelCrop } from 'react-image-crop';

import { ACCEPTED_ARTWORK_INPUT } from './artwork-editor.constants';
import { getCenteredSquareCrop, renderCroppedArtwork, validateArtworkFile } from './artwork-editor.utils';

import 'react-image-crop/dist/ReactCrop.css';
import styles from './artwork-editor.module.scss';

export const ArtworkEditor = memo<ArtworkEditorProps>(function ArtworkEditor(props) {
  const { disabled, onArtworkChange, providerArtworkUrl, resetKey } = props;

  const inputId = useId();
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [draftUrl, setDraftUrl] = useState<string>();
  const [error, setError] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const uploadedUrlRef = useRef<string | undefined>(undefined);

  const isChanged = Boolean(previewUrl);
  const visiblePreviewUrl = previewUrl ?? providerArtworkUrl;

  const revokeUploadedUrl = useCallback(() => {
    if (uploadedUrlRef.current) {
      URL.revokeObjectURL(uploadedUrlRef.current);
      uploadedUrlRef.current = undefined;
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

  const resetDraft = useCallback(() => {
    revokeUploadedUrl();
    setDraftUrl(providerArtworkUrl ?? undefined);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setError('');
    imageRef.current = null;
  }, [providerArtworkUrl, revokeUploadedUrl]);

  const prepareDraft = useCallback(
    (url?: string | null) => {
      revokeUploadedUrl();
      setDraftUrl(url ?? undefined);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setError('');
      imageRef.current = null;
    },
    [revokeUploadedUrl],
  );

  useEffect(() => {
    revokePreviewUrl();
    resetDraft();
    setIsSheetOpen(false);
    onArtworkChange(undefined);
  }, [onArtworkChange, resetDraft, resetKey, revokePreviewUrl]);

  useEffect(
    () => () => {
      revokePreviewUrl();
      revokeUploadedUrl();
    },
    [revokePreviewUrl, revokeUploadedUrl],
  );

  const handleOpen = useCallback(() => {
    prepareDraft(previewUrl ?? providerArtworkUrl);
    setIsSheetOpen(true);
  }, [prepareDraft, previewUrl, providerArtworkUrl]);

  const handleClose = useCallback(() => {
    resetDraft();
    setIsSheetOpen(false);
  }, [resetDraft]);

  const handleReset = useCallback(() => {
    revokePreviewUrl();
    resetDraft();
    onArtworkChange(undefined);
  }, [onArtworkChange, resetDraft, revokePreviewUrl]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        return;
      }

      try {
        await validateArtworkFile(file);
        revokeUploadedUrl();
        setError('');
        setCrop(undefined);
        setCompletedCrop(undefined);

        const objectUrl = URL.createObjectURL(file);
        uploadedUrlRef.current = objectUrl;
        setDraftUrl(objectUrl);
      } catch (validationError) {
        setError(validationError instanceof Error ? validationError.message : 'Invalid artwork file.');
      }
    },
    [revokeUploadedUrl],
  );

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const centeredCrop = getCenteredSquareCrop(image.width, image.height);

    imageRef.current = image;
    setCrop(centeredCrop);
    setCompletedCrop(convertToPixelCrop(centeredCrop, image.width, image.height));
  }, []);

  const handleApply = useCallback(() => {
    if (!completedCrop || !imageRef.current) {
      setError('Select an artwork area before applying.');
      return;
    }

    void renderCroppedArtwork(imageRef.current, completedCrop)
      .then((file) => {
        revokePreviewUrl();
        const objectUrl = URL.createObjectURL(file);

        setPreviewUrl(objectUrl);
        onArtworkChange({
          file,
          source: 'custom',
        });
        setIsSheetOpen(false);
      })
      .catch((renderError: unknown) => {
        setError(renderError instanceof Error ? renderError.message : 'Could not prepare artwork.');
      });
  }, [completedCrop, onArtworkChange, revokePreviewUrl]);

  return (
    <div className={styles.artworkEditor}>
      <div className={styles.previewRow}>
        <div className={styles.preview}>
          {visiblePreviewUrl ? (
            <img src={visiblePreviewUrl} alt='' />
          ) : (
            <Text variant='caption-2' color='secondary'>
              No artwork
            </Text>
          )}
        </div>

        <div className={styles.summary}>
          <Text variant='body-1'>
            {isChanged ? 'Custom artwork' : providerArtworkUrl ? 'Default artwork' : 'No artwork'}
          </Text>
          <div className={styles.controls}>
            <Button size='m' view='outlined' disabled={disabled} onClick={handleOpen}>
              <Icon size={16} data={Pencil} /> {visiblePreviewUrl ? 'Edit' : 'Add'}
            </Button>
            {isChanged && (
              <Button size='m' view='flat-secondary' disabled={disabled} onClick={handleReset}>
                <Icon size={16} data={ArrowRotateLeft} /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <Sheet
        id='download-artwork-editor'
        title='Edit artwork'
        visible={isSheetOpen}
        onClose={handleClose}
        alwaysFullHeight
        contentClassName={styles.sheetContent}
      >
        <div className={styles.sheet}>
          <div className={styles.sheetToolbar}>
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

            {error && (
              <Text className={styles.error} variant='caption-2' color='danger'>
                {error}
              </Text>
            )}
          </div>

          <div className={styles.cropArea}>
            {draftUrl ? (
              <ReactCrop
                className={styles.crop}
                aspect={1}
                crop={crop}
                keepSelection
                minWidth={64}
                minHeight={64}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
              >
                <img src={draftUrl} alt='' crossOrigin='anonymous' onLoad={handleImageLoad} />
              </ReactCrop>
            ) : (
              <div className={styles.emptyCrop}>
                <Text variant='body-2' color='secondary'>
                  Upload artwork to start editing.
                </Text>
              </div>
            )}
          </div>

          <div className={styles.sheetActions}>
            <Button size='xl' view='outlined' onClick={handleClose}>
              Cancel
            </Button>
            <Button size='xl' view='action' disabled={!draftUrl || disabled} onClick={handleApply}>
              Apply artwork
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
});
