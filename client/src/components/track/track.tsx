import { memo } from 'react';
import { Avatar, Button, Icon, Text } from '@gravity-ui/uikit';
import { ArrowShapeDownToLine } from '@gravity-ui/icons';

import styles from './track.module.scss';

type TrackProps = {
    title: string;
    coverUrl: string;
    duration: number;
    onDownloadClick: () => void;
};

const getDuration = (milliseconds: number): string => {
    /* Convert milliseconds to total seconds */
    const totalSeconds = Math.floor(milliseconds / 1000);

    /* Calculate minutes and remaining seconds */
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    /* Add leading zero to seconds if less than 10 */
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    return `${minutes}:${formattedSeconds}`;
};

export const Track = memo((props: TrackProps) => {
    const { title, coverUrl, duration, onDownloadClick } = props;

    return (
        <div className={styles.track}>
            <Avatar className={styles.cover} size='l' imgUrl={coverUrl} />

            <div className={styles.wrapper}>
                <Text>{title}</Text>

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
