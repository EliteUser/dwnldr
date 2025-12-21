import { Track } from '../track/track.tsx';
import { memo, useMemo, useRef, useState } from 'react';
import { TracksResult } from '../../api/api.slice';
import { FileData } from '../../types';
import { Icon, Text, TextInput } from '@gravity-ui/uikit';
import { Magnifier } from '@gravity-ui/icons';

import styles from './track-list.module.scss';
import { useVirtualizer } from '@tanstack/react-virtual';

export type TrackListProps = {
    tracks?: TracksResult[];
    files?: FileData[];
    onDownloadClick: (url: string) => void;
};

const filterFn = (arg: string, filterValue: string) => arg.toLowerCase().includes(filterValue.toLowerCase());

export const TrackList = memo<TrackListProps>((props) => {
    const { tracks, onDownloadClick } = props;

    const parentRef = useRef<HTMLDivElement>(null);

    const [filter, setFilter] = useState('');

    const filteredTracks = useMemo(() => {
        if (!tracks?.length) {
            return [];
        }

        return tracks?.filter(({ title, user }) => filterFn(user, filter) || filterFn(title, filter));
    }, [tracks, filter]);

    /* region Virtualizer */
    const count = filteredTracks.length;

    const virtualizer = useVirtualizer({
        count,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 4,
    });

    const items = virtualizer.getVirtualItems();
    /* endregion Virtualizer */

    return (
        <div className={styles.wrapper}>
            <TextInput
                className={styles.search}
                size='l'
                placeholder='Search'
                hasClear
                value={filter}
                endContent={
                    <div className={styles.searchIcon}>
                        <Icon size={16} data={Magnifier} />
                    </div>
                }
                onChange={(evt) => setFilter(evt.target.value)}
            />

            {filteredTracks.length > 0 ? (
                <div ref={parentRef} className={styles.list}>
                    <div className={styles.virtualizer} style={{ minHeight: virtualizer.getTotalSize() }}>
                        <div
                            className={styles.virtualizerContainer}
                            style={{
                                transform: `translateY(${items[0]?.start ?? 0}px)`,
                            }}
                        >
                            {items.map((virtualRow) => {
                                const { user, title, artwork_url, permalink_url, duration } =
                                    filteredTracks[virtualRow.index];

                                const trackTitle = `${user} - ${title}`;

                                return (
                                    <Track
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        title={trackTitle}
                                        duration={duration}
                                        coverUrl={artwork_url}
                                        onDownloadClick={() => onDownloadClick(permalink_url)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <Text variant='body-2'>Nothing found</Text>
            )}
        </div>
    );
});

TrackList.displayName = 'TrackList';
