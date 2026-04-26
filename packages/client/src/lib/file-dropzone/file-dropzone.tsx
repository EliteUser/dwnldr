import type { DragEvent, ReactNode } from 'react';
import { memo, useCallback, useRef, useState } from 'react';

import styles from './file-dropzone.module.scss';

type FileDropzoneProps = {
  activeHint?: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  idleHint?: ReactNode;
  idleHintView?: 'badge' | 'inline';
  onFileDrop: (file: File) => void;
};

const getDraggedFile = (event: DragEvent<HTMLElement>) => event.dataTransfer.files[0];

export const FileDropzone = memo<FileDropzoneProps>((props) => {
  const {
    activeHint = 'Drop file here',
    children,
    className = '',
    disabled,
    idleHint,
    idleHintView = 'badge',
    onFileDrop,
  } = props;
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);

      const file = getDraggedFile(event);

      if (file) {
        onFileDrop(file);
      }
    },
    [disabled, onFileDrop],
  );

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${className}`}
      data-dragging={isDragging || undefined}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {!disabled && idleHint && (
        <div
          className={idleHintView === 'inline' ? styles.inlineHint : styles.hint}
          data-hidden={isDragging || undefined}
        >
          {idleHint}
        </div>
      )}

      {!disabled && isDragging && <div className={styles.overlay}>{activeHint}</div>}
    </div>
  );
});

FileDropzone.displayName = 'FileDropzone';
