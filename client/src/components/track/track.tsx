import { memo } from 'react';
import { Avatar, Button, Icon, Text } from '@gravity-ui/uikit';
import { ArrowShapeDownToLine } from '@gravity-ui/icons';

import { getDuration } from '../../utils';

import clsx from 'clsx';
import styles from './track.module.scss';

type TrackProps = {
    title: string;
    coverUrl: string;
    duration: number;
    downloaded: boolean;
    onDownloadClick: () => void;
};

export const Track = memo((props: TrackProps) => {
    const { title, coverUrl, duration, downloaded, onDownloadClick } = props;

    const trackClassNames = clsx(styles.track, { [styles.downloaded]: downloaded });

    return (
        <div className={trackClassNames}>
            <Avatar className={styles.cover} size='l' imgUrl={coverUrl} />

            <div className={styles.wrapper}>
                <div className={styles.titleWrapper}>
                    <Text>{title}</Text>

                    <div className={styles.status} />
                </div>

                <Text variant='caption-2' color='secondary'>
                    {getDuration(duration)}
                </Text>
            </div>

            <Button className={styles.button} view='outlined-action' onClick={onDownloadClick}>
                <Icon size={16} data={ArrowShapeDownToLine} />
            </Button>
        </div>
    );
});
