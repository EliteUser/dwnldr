import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Track } from './track';

import styles from './track.module.scss';

describe('Track', () => {
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
