import { ActionIcon, Avatar, Text } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import clsx from 'clsx';
import { memo, useCallback } from 'react';

import { getDuration } from '../../utils';

import styles from './track.module.scss';

type TrackProps = {
  title: string;
  coverUrl: string | null;
  downloadUrl: string;
  duration: number;
  isDirectorySelected: boolean;
  isDownloaded: boolean;
  onDownloadClick: (url: string) => void;
};

export const Track = memo<TrackProps>(function Track(props) {
  const { title, coverUrl, downloadUrl, duration, isDirectorySelected, isDownloaded, onDownloadClick } = props;

  const handleDownloadClick = useCallback(() => {
    onDownloadClick(downloadUrl);
  }, [downloadUrl, onDownloadClick]);

  const trackClassNames = clsx(styles.track, {
    [styles.downloaded]: isDownloaded,
    [styles.directorySelected]: isDirectorySelected,
  });

  return (
    <div className={trackClassNames}>
      <div className={styles.cover}>
        <Avatar className={styles.image} radius='md' size={48} src={coverUrl ?? ''} />
      </div>

      <div className={styles.wrapper}>
        <Text className={styles.title} size='sm'>
          {title}
        </Text>

        <Text size='xs' c='dimmed'>
          {getDuration(duration)}
        </Text>
      </div>

      <ActionIcon
        className={styles.button}
        aria-label={`Download ${title}`}
        variant='outline'
        size='lg'
        onClick={handleDownloadClick}
      >
        <IconDownload size={16} />
      </ActionIcon>
    </div>
  );
});
