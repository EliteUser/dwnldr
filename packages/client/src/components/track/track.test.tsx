import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Track } from './track';

import styles from './track.module.scss';

describe('Track', () => {
  it('lazily retries a failed artwork request once', () => {
    render(
      <Track
        title='Artist - Track Title'
        coverUrl='https://i1.sndcdn.com/artworks-example-large.jpg'
        duration={210000}
        isDirectorySelected
        isDownloaded={false}
        downloadUrl='https://soundcloud.com/artist/track-title'
        onDownloadClick={() => undefined}
      />,
    );

    const image = screen.getByRole('img');

    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('src', 'https://i1.sndcdn.com/artworks-example-large.jpg');

    fireEvent.error(image);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://i1.sndcdn.com/artworks-example-large.jpg?retry=1');

    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://i1.sndcdn.com/artworks-example-large.jpg?retry=1');
  });

  it('clears the downloaded state when the synced file list becomes empty', async () => {
    const { container, rerender } = render(
      <Track
        title='Artist - Track Title'
        coverUrl=''
        duration={210000}
        isDirectorySelected
        isDownloaded
        downloadUrl='https://soundcloud.com/artist/track-title'
        onDownloadClick={() => undefined}
      />,
    );

    const root = container.firstElementChild as HTMLElement;

    await waitFor(() => {
      expect(root).toHaveClass(styles.downloaded);
    });

    rerender(
      <Track
        title='Artist - Track Title'
        coverUrl=''
        duration={210000}
        isDirectorySelected
        isDownloaded={false}
        downloadUrl='https://soundcloud.com/artist/track-title'
        onDownloadClick={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(root).not.toHaveClass(styles.downloaded);
    });
  });
});
