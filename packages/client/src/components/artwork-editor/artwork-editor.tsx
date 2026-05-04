import { Button, CloseButton, Drawer, Flex, Text } from '@mantine/core';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { PixelCrop } from 'react-image-crop';
import ReactCrop, { convertToPixelCrop, type Crop } from 'react-image-crop';

import type { ArtworkEditorProps, ImageSize } from './artwork-editor.types';
import {
  getCenteredSquareCrop,
  getContainedImageSize,
  getCropAreaSize,
  renderCroppedArtwork,
} from './artwork-editor.utils';

import 'react-image-crop/dist/ReactCrop.css';
import styles from './artwork-editor.module.scss';

export const ArtworkEditor = memo<ArtworkEditorProps>((props) => {
  const { disabled, draftUrl, initialCrop, onApply, onClose, visible } = props;

  const cropAreaRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [error, setError] = useState('');
  const [imageFrame, setImageFrame] = useState<ImageSize>();
  const [naturalImageSize, setNaturalImageSize] = useState<ImageSize>();

  const updateImageFrame = useCallback((nextNaturalImageSize: ImageSize) => {
    const cropAreaSize = getCropAreaSize(cropAreaRef.current);

    if (!cropAreaSize) {
      return;
    }

    setImageFrame(getContainedImageSize(nextNaturalImageSize, cropAreaSize));
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setCrop(undefined);
    setCompletedCrop(undefined);
    setError('');
    setImageFrame(undefined);
    setNaturalImageSize(undefined);
    imageRef.current = null;
  }, [draftUrl, visible]);

  useEffect(() => {
    if (!visible || !naturalImageSize) {
      return;
    }

    const cropArea = cropAreaRef.current;

    if (!cropArea || !('ResizeObserver' in window)) {
      updateImageFrame(naturalImageSize);
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateImageFrame(naturalImageSize);
    });

    resizeObserver.observe(cropArea);
    updateImageFrame(naturalImageSize);

    return () => {
      resizeObserver.disconnect();
    };
  }, [naturalImageSize, updateImageFrame, visible]);

  useEffect(() => {
    if (!crop || !imageFrame) {
      return;
    }

    setCompletedCrop(convertToPixelCrop(crop, imageFrame.width, imageFrame.height));
  }, [crop, imageFrame]);

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget;
      const nextNaturalImageSize = {
        height: image.naturalHeight,
        width: image.naturalWidth,
      };
      const cropAreaSize = getCropAreaSize(cropAreaRef.current);
      const nextImageFrame = cropAreaSize ? getContainedImageSize(nextNaturalImageSize, cropAreaSize) : undefined;
      const cropBounds = nextImageFrame ?? {
        height: image.height,
        width: image.width,
      };
      const nextCrop = initialCrop ?? getCenteredSquareCrop(cropBounds.width, cropBounds.height);

      imageRef.current = image;
      setNaturalImageSize(nextNaturalImageSize);
      setImageFrame(nextImageFrame);
      setCrop(nextCrop);
      setCompletedCrop(convertToPixelCrop(nextCrop, cropBounds.width, cropBounds.height));
    },
    [initialCrop],
  );

  const handleApply = useCallback(() => {
    if (!completedCrop || !crop || !imageRef.current) {
      setError('Select an artwork area before applying.');
      return;
    }

    void renderCroppedArtwork(imageRef.current, completedCrop)
      .then((file) => {
        onApply(file, crop);
      })
      .catch((renderError: unknown) => {
        setError(renderError instanceof Error ? renderError.message : 'Could not prepare artwork.');
      });
  }, [completedCrop, crop, onApply]);

  return (
    <Drawer
      id='download-artwork-editor'
      aria-label='Edit artwork'
      opened={visible}
      onClose={onClose}
      position='bottom'
      size='75dvh'
      offset={8}
      radius={8}
      withCloseButton={false}
      classNames={{ body: styles.sheetContent, content: styles.sheetPanel }}
      styles={{ body: { overflow: 'hidden' }, content: { overflow: 'hidden' } }}
    >
      <div className={styles.sheet}>
        <div className={styles.sheetHeader}>
          <Text size='lg' fw={600}>
            Edit artwork
          </Text>

          <CloseButton aria-label='Close artwork editor' size='lg' onClick={onClose} />
        </div>

        {error && (
          <Text className={styles.error} size='sm' c='red'>
            {error}
          </Text>
        )}

        <div className={styles.cropArea} ref={cropAreaRef}>
          {draftUrl ? (
            <ReactCrop
              className={styles.crop}
              style={
                imageFrame
                  ? {
                      height: imageFrame.height,
                      width: imageFrame.width,
                    }
                  : undefined
              }
              aspect={1}
              crop={crop}
              keepSelection
              minWidth={64}
              minHeight={64}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
            >
              <img
                src={draftUrl}
                alt=''
                crossOrigin='anonymous'
                style={
                  imageFrame
                    ? {
                        height: imageFrame.height,
                        width: imageFrame.width,
                      }
                    : undefined
                }
                onLoad={handleImageLoad}
              />
            </ReactCrop>
          ) : (
            <div className={styles.emptyCrop}>
              <Text c='dimmed'>Select artwork to start editing.</Text>
            </div>
          )}
        </div>

        <Flex columnGap='sm'>
          <Button size='sm' variant='outline' fullWidth onClick={onClose}>
            Cancel
          </Button>

          <Button size='sm' disabled={!draftUrl || disabled} fullWidth onClick={handleApply}>
            Apply
          </Button>
        </Flex>
      </div>
    </Drawer>
  );
});

ArtworkEditor.displayName = 'ArtworkEditor';
