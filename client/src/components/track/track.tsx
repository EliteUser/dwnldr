import { forwardRef, memo, useEffect, useState } from 'react';
import { Avatar, Button, Icon, Text } from '@gravity-ui/uikit';
import { ArrowDownToLine } from '@gravity-ui/icons';

import { getDuration, isTrackDownloaded } from '../../utils';

import clsx from 'clsx';
import styles from './track.module.scss';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

type TrackProps = {
    title: string;
    coverUrl: string;
    duration: number;
    onDownloadClick: () => void;
};

export const Track = memo(
    forwardRef<HTMLDivElement, TrackProps>((props, ref) => {
        const { title, coverUrl, duration, onDownloadClick, ...rest } = props;

        const files = useSelector((state: RootState) => state.files.files);

        const [isDownloaded, setIsDownloaded] = useState(false);

        useEffect(() => {
            const rafId = window.requestAnimationFrame(() => {
                if (files.length) {
                    setIsDownloaded(isTrackDownloaded(files, title));
                }
            });

            return () => {
                cancelAnimationFrame(rafId);
            };
        }, [files, title]);

        const trackClassNames = clsx(styles.track, { [styles.downloaded]: isDownloaded });

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

                <Button className={styles.button} view='outlined-action' onClick={onDownloadClick}>
                    <Icon size={16} data={ArrowDownToLine} />
                </Button>
            </div>
        );
    }),
);
