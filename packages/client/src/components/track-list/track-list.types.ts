import type { Track } from '@dwnldr/shared';

export type DownloadFilter = 'all' | 'downloaded' | 'not-downloaded';

export type IsDownloadedTrack = (title: string) => boolean;

export type TrackListProps = {
  tracks?: Track[];
  onDownloadClick: (url: string) => void;
};
