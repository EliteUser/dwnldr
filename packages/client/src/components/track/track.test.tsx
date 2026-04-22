import type { ReactNode } from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { act, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import filesReducer, { clearFiles } from '../../store/files.slice';
import userReducer from '../../store/user.slice';
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
    const store = configureStore({
      reducer: {
        files: filesReducer,
        user: userReducer,
      },
      preloadedState: {
        files: {
          loading: false,
          files: [
            {
              name: 'Artist - Track Title',
              extension: 'mp3',
            },
          ],
          directoryName: 'Music',
        },
        user: {
          userId: null,
        },
      },
    });

    const { container } = render(
      <Provider store={store}>
        <Track title='Artist - Track Title' coverUrl='' duration={210000} onDownloadClick={() => undefined} />
      </Provider>,
    );

    const root = container.firstElementChild as HTMLElement;

    await waitFor(() => {
      expect(root).toHaveClass(styles.downloaded);
    });

    await act(async () => {
      store.dispatch(clearFiles());
    });

    await waitFor(() => {
      expect(root).not.toHaveClass(styles.downloaded);
    });
  });
});
