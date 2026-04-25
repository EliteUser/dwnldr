import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Track } from './track';

import styles from './track.module.scss';

vi.mock('@gravity-ui/uikit', () => ({
  Avatar: ({ className }: { className?: string }) => <div className={className} />,
  Button: ({ children, className, onClick }: { children?: ReactNode; className?: string; onClick?: () => void }) => (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  ),
  Icon: () => null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@gravity-ui/icons', () => ({
  ArrowDownToLine: {},
}));

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
