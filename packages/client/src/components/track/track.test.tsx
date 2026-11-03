import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { Track } from './track';

import styles from './track.module.scss';

const props = {
  coverUrl: 'https://i1.sndcdn.com/artworks-example-large.jpg',
  downloadUrl: 'https://soundcloud.com/artist/track-title',
  duration: 210000,
  isDirectorySelected: true,
  isDownloaded: false,
  title: 'Artist - Track Title',
};

describe('Track', () => {
  it('shows the title and duration and opens the track for download', () => {
    const onDownloadClick = vi.fn();

    renderWithProviders(<Track {...props} onDownloadClick={onDownloadClick} />);

    expect(screen.getByText('3:30')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download Artist - Track Title' }));
    expect(onDownloadClick).toHaveBeenCalledWith(props.downloadUrl);
  });

  it('marks downloaded tracks', () => {
    const { rerender } = renderWithProviders(<Track {...props} isDownloaded onDownloadClick={vi.fn()} />);
    const row = () => screen.getByText(props.title).closest(`.${styles.track}`);

    expect(row()).toHaveClass(styles.downloaded);

    rerender(<Track {...props} onDownloadClick={vi.fn()} />);

    expect(row()).not.toHaveClass(styles.downloaded);
  });
});
