import type { Track } from '@dwnldr/shared';

import { DOWNLOAD_FILTER_ORDER } from './track-list.constants';
import type { DownloadFilter, IsDownloadedTrack } from './track-list.types';

const includesFilter = (value: string, filter: string) => value.toLowerCase().includes(filter.toLowerCase());

export const filterTracks = (
  tracks: Track[] | undefined,
  searchFilter: string,
  downloadFilter: DownloadFilter,
  isDownloadedTrack: IsDownloadedTrack,
) => {
  if (!tracks?.length) {
    return [];
  }

  return tracks.filter(({ artist, title }) => {
    if (!includesFilter(artist, searchFilter) && !includesFilter(title, searchFilter)) {
      return false;
    }

    if (downloadFilter === 'all') {
      return true;
    }

    const isDownloaded = isDownloadedTrack(`${artist} - ${title}`);

    return downloadFilter === 'downloaded' ? isDownloaded : !isDownloaded;
  });
};

export const getNextDownloadFilter = (currentFilter: DownloadFilter) => {
  const currentIndex = DOWNLOAD_FILTER_ORDER.indexOf(currentFilter);

  return DOWNLOAD_FILTER_ORDER[(currentIndex + 1) % DOWNLOAD_FILTER_ORDER.length];
};
