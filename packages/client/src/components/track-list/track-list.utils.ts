import type { TracksResult } from '../../api/api';
import { DOWNLOAD_FILTER_ORDER } from './track-list.constants';
import type { DownloadFilter, IsDownloadedTrack } from './track-list.types';

const includesFilter = (value: string, filter: string) => value.toLowerCase().includes(filter.toLowerCase());

export const filterTracks = (
  tracks: TracksResult[] | undefined,
  searchFilter: string,
  downloadFilter: DownloadFilter,
  isDownloadedTrack: IsDownloadedTrack,
) => {
  if (!tracks?.length) {
    return [];
  }

  return tracks.filter(({ title, user }) => {
    if (!includesFilter(user, searchFilter) && !includesFilter(title, searchFilter)) {
      return false;
    }

    if (downloadFilter === 'all') {
      return true;
    }

    const isDownloaded = isDownloadedTrack(`${user} - ${title}`);

    return downloadFilter === 'downloaded' ? isDownloaded : !isDownloaded;
  });
};

export const getNextDownloadFilter = (currentFilter: DownloadFilter) => {
  const currentIndex = DOWNLOAD_FILTER_ORDER.indexOf(currentFilter);

  return DOWNLOAD_FILTER_ORDER[(currentIndex + 1) % DOWNLOAD_FILTER_ORDER.length];
};
