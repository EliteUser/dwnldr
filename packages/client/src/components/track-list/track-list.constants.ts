import type { DownloadFilter } from './track-list.types';

export const TRACK_ROW_HEIGHT = 64;
export const TRACK_LIST_OVERSCAN = 2;

export const DOWNLOAD_FILTER_ORDER: DownloadFilter[] = ['all', 'not-downloaded', 'downloaded'];

export const DOWNLOAD_FILTER_LABELS: Record<DownloadFilter, string> = {
  all: 'all tracks',
  downloaded: 'downloaded tracks',
  'not-downloaded': 'tracks not downloaded',
};
