import type { Track } from '@dwnldr/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import { TrackList } from './track-list';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 64,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 64 })),
  }),
}));

vi.mock('../track/track', () => ({
  Track: ({ title }: { title: string }) => <div>{title}</div>,
}));

const tracks: Track[] = [
  {
    id: '1',
    artworkUrl: null,
    durationMs: 1000,
    url: 'https://soundcloud.com/artist/downloaded',
    title: 'Downloaded',
    artist: 'Artist',
  },
  {
    id: '2',
    artworkUrl: null,
    durationMs: 1000,
    url: 'https://soundcloud.com/artist/new',
    title: 'New',
    artist: 'Artist',
  },
];

describe('TrackList', () => {
  beforeEach(() => {
    useAppStore.setState({
      directoryName: 'Music',
      files: [{ extension: 'mp3', name: 'Artist - Downloaded' }],
    });
  });

  it('cycles through all, downloaded, and not-downloaded filters', () => {
    render(<TrackList tracks={tracks} onDownloadClick={() => undefined} />);

    expect(screen.getByText('Artist - Downloaded')).toBeInTheDocument();
    expect(screen.getByText('Artist - New')).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Search tracks' })).toBeInTheDocument();

    const filterButton = screen.getByRole('button', {
      name: 'Download filter showing all tracks; activate to show tracks not downloaded.',
    });
    expect(filterButton).toHaveAttribute(
      'title',
      'Download filter showing all tracks; activate to show tracks not downloaded.',
    );

    fireEvent.click(filterButton);

    expect(filterButton).toHaveAttribute(
      'aria-label',
      'Download filter showing tracks not downloaded; activate to show downloaded tracks.',
    );
    expect(screen.queryByText('Artist - Downloaded')).not.toBeInTheDocument();
    expect(screen.getByText('Artist - New')).toBeInTheDocument();

    fireEvent.click(filterButton);

    expect(filterButton).toHaveAttribute(
      'aria-label',
      'Download filter showing downloaded tracks; activate to show all tracks.',
    );
    expect(screen.getByText('Artist - Downloaded')).toBeInTheDocument();
    expect(screen.queryByText('Artist - New')).not.toBeInTheDocument();

    fireEvent.click(filterButton);

    expect(screen.getByText('Artist - Downloaded')).toBeInTheDocument();
    expect(screen.getByText('Artist - New')).toBeInTheDocument();
  });
});
