import { ArrowDownToLine } from '@gravity-ui/icons';
import { Avatar, Button, Icon, Text } from '@gravity-ui/uikit';
import clsx from 'clsx';
import { forwardRef, memo } from 'react';

import { useAppSelector } from '../../store';
import { getDuration, isTrackDownloaded } from '../../utils';

import styles from './track.module.scss';

type TrackProps = {
  title: string;
  coverUrl: string;
  duration: number;
  onDownloadClick: () => void;
};

export const Track = memo(
  forwardRef<HTMLDivElement, TrackProps>(function Track(props, ref) {
    const { title, coverUrl, duration, onDownloadClick, ...rest } = props;

    const files = useAppSelector((state) => state.files.files);
    const directory = useAppSelector((state) => state.files.directoryName);

    const isDownloaded = files.length > 0 && isTrackDownloaded(files, title);

    const trackClassNames = clsx(styles.track, {
      [styles.downloaded]: isDownloaded,
      [styles.directorySelected]: !!directory,
    });

    return (
      <div ref={ref} className={trackClassNames} {...rest}>
        <div className={styles.cover}>
          <Avatar className={styles.image} size='xl' imgUrl={coverUrl} />
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
          onClick={onDownloadClick}
          aria-label={`Download ${title}`}
        >
          <Icon size={16} data={ArrowDownToLine} />
        </Button>
      </div>
    );
  }),
);
