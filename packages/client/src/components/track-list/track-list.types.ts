import type { TracksResult } from '../../api/api';

export type DownloadFilter = 'all' | 'downloaded' | 'not-downloaded';

export type IsDownloadedTrack = (title: string) => boolean;

export type TrackListProps = {
  tracks?: TracksResult[];
  onDownloadClick: (url: string) => void;
};
