import { ActionIcon, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { memo, useMemo, useRef, useState } from 'react';

import { useAppStore } from '../../store';
import { createDownloadedTrackMatcher } from '../../utils';
import { Track } from '../track/track';
import { TRACK_ROW_HEIGHT } from './track-list.constants';
import type { DownloadFilter, TrackListProps } from './track-list.types';
import { filterTracks, getNextDownloadFilter } from './track-list.utils';

import styles from './track-list.module.scss';

export const TrackList = memo<TrackListProps>((props) => {
  const { tracks, onDownloadClick } = props;

  const parentRef = useRef<HTMLDivElement>(null);
  const files = useAppStore((state) => state.files);
  const isDirectorySelected = useAppStore((state) => !!state.directoryName);
  const isDownloadedTrack = useMemo(() => createDownloadedTrackMatcher(files), [files]);

  const [filter, setFilter] = useState('');
  const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>('all');

  const filteredTracks = useMemo(
    () => filterTracks(tracks, filter, downloadFilter, isDownloadedTrack),
    [downloadFilter, filter, isDownloadedTrack, tracks],
  );

  const cycleDownloadFilter = () => {
    setDownloadFilter(getNextDownloadFilter);
  };

  /* region Virtualizer */
  const count = filteredTracks.length;

  const virtualizer = useVirtualizer({
    count,
    getItemKey: (index) => filteredTracks[index]?.id ?? filteredTracks[index]?.permalink_url ?? index,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TRACK_ROW_HEIGHT,
    overscan: 6,
  });

  const items = virtualizer.getVirtualItems();
  /* endregion Virtualizer */

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <TextInput
          className={styles.search}
          size='md'
          placeholder='Search'
          value={filter}
          leftSection={
            <div className={styles.searchIcon}>
              <IconSearch size={16} />
            </div>
          }
          onChange={(evt) => setFilter(evt.target.value)}
        />

        <ActionIcon className={styles.filterButton} variant='default' size='input-md' onClick={cycleDownloadFilter}>
          <span
            className={clsx(styles.filterDot, {
              [styles.downloaded]: downloadFilter === 'downloaded',
              [styles.notDownloaded]: downloadFilter === 'not-downloaded',
            })}
          />
        </ActionIcon>
      </div>

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
                const { user, title, artwork_url, permalink_url, duration } = filteredTracks[virtualRow.index];

                const trackTitle = `${user} - ${title}`;

                return (
                  <Track
                    key={virtualRow.key}
                    title={trackTitle}
                    duration={duration}
                    coverUrl={artwork_url}
                    downloadUrl={permalink_url}
                    isDirectorySelected={isDirectorySelected}
                    isDownloaded={files.length > 0 && isDownloadedTrack(trackTitle)}
                    onDownloadClick={onDownloadClick}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Text>Nothing found</Text>
      )}
    </div>
  );
});

TrackList.displayName = 'TrackList';
