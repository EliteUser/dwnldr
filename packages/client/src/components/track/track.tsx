import { ArrowDownToLine } from '@gravity-ui/icons';
import { Avatar, Button, Icon, Text } from '@gravity-ui/uikit';
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
        <Avatar className={styles.image} size='xl' imgUrl={coverUrl ?? ''} />
      </div>

      <div className={styles.wrapper}>
        <Text variant='body-1'>{title}</Text>

        <Text variant='caption-2' color='secondary'>
          {getDuration(duration)}
        </Text>
      </div>

      <Button
        className={styles.button}
        view='outlined-action'
        onClick={handleDownloadClick}
        aria-label={`Download ${title}`}
      >
        <Icon size={16} data={ArrowDownToLine} />
      </Button>
    </div>
  );
});
