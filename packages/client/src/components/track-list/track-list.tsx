import { Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useMemo, useRef, useState } from 'react';

import type { TracksResult } from '../../api/api';
import { useAppStore } from '../../store';
import { createDownloadedTrackMatcher } from '../../utils';
import { Track } from '../track/track';

import styles from './track-list.module.scss';

export type TrackListProps = {
  tracks?: TracksResult[];
  onDownloadClick: (url: string) => void;
};

const TRACK_ROW_HEIGHT = 64;

const filterFn = (arg: string, filterValue: string) => arg.toLowerCase().includes(filterValue.toLowerCase());

export const TrackList = memo<TrackListProps>((props) => {
  const { tracks, onDownloadClick } = props;

  const parentRef = useRef<HTMLDivElement>(null);
  const files = useAppStore((state) => state.files);
  const isDirectorySelected = useAppStore((state) => !!state.directoryName);
  const isDownloadedTrack = useMemo(() => createDownloadedTrackMatcher(files), [files]);

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
    getItemKey: (index) => filteredTracks[index]?.id ?? filteredTracks[index]?.permalink_url ?? index,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TRACK_ROW_HEIGHT,
    overscan: 6,
  });

  const items = virtualizer.getVirtualItems();
  /* endregion Virtualizer */

  return (
    <div className={styles.wrapper}>
      <TextInput
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
