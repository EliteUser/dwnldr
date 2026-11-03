import type { Track as TrackData } from '@dwnldr/shared';
import { ActionIcon, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { memo, useMemo, useRef, useState } from 'react';

import { useAppStore } from '../../store';
import { createDownloadedTrackMatcher } from '../../utils/match-track';
import { Track } from '../track/track';

import styles from './track-list.module.scss';

type DownloadFilter = 'all' | 'downloaded' | 'not-downloaded';

type TrackListProps = {
  tracks?: TrackData[];
  onDownloadClick: (url: string) => void;
};

const TRACK_ROW_HEIGHT = 64;
const TRACK_LIST_OVERSCAN = 2;
const DOWNLOAD_FILTER_ORDER: DownloadFilter[] = ['all', 'not-downloaded', 'downloaded'];
const DOWNLOAD_FILTER_LABELS: Record<DownloadFilter, string> = {
  all: 'all tracks',
  downloaded: 'downloaded tracks',
  'not-downloaded': 'tracks not downloaded',
};

const getNextDownloadFilter = (filter: DownloadFilter) =>
  DOWNLOAD_FILTER_ORDER[(DOWNLOAD_FILTER_ORDER.indexOf(filter) + 1) % DOWNLOAD_FILTER_ORDER.length];

const filterTracks = (
  tracks: TrackData[] | undefined,
  search: string,
  downloadFilter: DownloadFilter,
  isDownloadedTrack: (title: string) => boolean,
) => {
  const query = search.toLowerCase();

  return (tracks ?? []).filter(({ artist, title }) => {
    if (!artist.toLowerCase().includes(query) && !title.toLowerCase().includes(query)) {
      return false;
    }

    return downloadFilter === 'all' || isDownloadedTrack(`${artist} - ${title}`) === (downloadFilter === 'downloaded');
  });
};

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

  // oxlint-disable-next-line react/incompatible-library -- This virtualized list does not use React Compiler.
  const virtualizer = useVirtualizer({
    count,
    getItemKey: (index) => filteredTracks[index]?.id ?? index,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TRACK_ROW_HEIGHT,
    overscan: TRACK_LIST_OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();
  /* endregion Virtualizer */

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <TextInput
          aria-label='Search tracks'
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

        <ActionIcon
          aria-label={`Download filter showing ${DOWNLOAD_FILTER_LABELS[downloadFilter]}; activate to show ${DOWNLOAD_FILTER_LABELS[getNextDownloadFilter(downloadFilter)]}.`}
          className={styles.filterButton}
          title={`Download filter showing ${DOWNLOAD_FILTER_LABELS[downloadFilter]}; activate to show ${DOWNLOAD_FILTER_LABELS[getNextDownloadFilter(downloadFilter)]}.`}
          variant='default'
          size='input-md'
          onClick={cycleDownloadFilter}
        >
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
                const { artist, title, artworkUrl, url, durationMs } = filteredTracks[virtualRow.index];

                const trackTitle = `${artist} - ${title}`;

                return (
                  <Track
                    key={virtualRow.key}
                    title={trackTitle}
                    duration={durationMs}
                    coverUrl={artworkUrl}
                    downloadUrl={url}
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
