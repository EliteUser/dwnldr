import type { ReactNode } from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import filesReducer from '../../store/files.slice';
import userReducer from '../../store/user.slice';
import { Likes } from './likes';

const favoritesQueryMock = vi.fn();
const notifyApiErrorMock = vi.fn();
const refetchMock = vi.fn();

vi.mock('@gravity-ui/uikit', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenu: ({
    items,
    renderSwitcher,
  }: {
    items: Array<{ action?: () => void; hidden?: boolean; text: ReactNode }>;
    renderSwitcher: (props: Record<string, never>) => ReactNode;
  }) => (
    <div>
      {renderSwitcher({})}
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <div key={typeof item.text === 'string' ? item.text : 'item'}>
            <button onClick={item.action}>{item.text}</button>
          </div>
        ))}
    </div>
  ),
  Icon: () => null,
  Loader: () => <div>Loading</div>,
  Progress: () => <div>Progress</div>,
  Text: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@gravity-ui/icons', () => ({
  ArrowRotateRight: {},
  FolderArrowUpIn: {},
  FolderOpen: {},
  Gear: {},
}));

vi.mock('../../api/api.slice', () => ({
  apiSlice: {
    reducerPath: 'api',
    reducer: () => ({}),
    middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
  },
  useGetFavoritesQuery: (...args: unknown[]) => favoritesQueryMock(...args),
}));

vi.mock('../../utils', () => ({
  FILE_SYSTEM_ACCESS_HELP_TEXT: 'Folder sync help',
  canUseFileSystemAccess: () => true,
  getApiErrorFromRtkError: (error: unknown) => error,
  handleSelectFolder: vi.fn(),
  handleSyncFolder: vi.fn(),
  useNotify: () => ({
    apiError: notifyApiErrorMock,
  }),
}));

vi.mock('../track-list/track-list', () => ({
  TrackList: () => <div>Track List</div>,
}));

vi.mock('../user-input/user-input', () => ({
  UserInput: () => <div>User Input</div>,
}));

const renderLikes = (
  userId: string | null,
  filesState?: {
    directoryName?: string | null;
    files?: Array<{ extension: string; name: string }>;
    lastSyncAt?: string | null;
    loading?: boolean;
  },
) => {
  const store = configureStore({
    reducer: {
      files: filesReducer,
      user: userReducer,
    },
    preloadedState: {
      files: {
        loading: filesState?.loading ?? false,
        files: filesState?.files ?? [],
        directoryName: filesState?.directoryName ?? null,
        lastSyncAt: filesState?.lastSyncAt ?? null,
      },
      user: {
        userId,
      },
    },
  });

  return render(
    <Provider store={store}>
      <Likes onDownloadClick={() => undefined} onFavoritesCountChange={() => undefined} />
    </Provider>,
  );
};

describe('Likes', () => {
  beforeEach(() => {
    favoritesQueryMock.mockReset();
    notifyApiErrorMock.mockReset();
    refetchMock.mockReset();
  });

  it('shows a getting-started empty state when no user is configured', () => {
    favoritesQueryMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes(null);

    expect(screen.getByText('Enter your SoundCloud user ID to load your likes')).toBeInTheDocument();
  });

  it('shows a retry state when loading likes fails', () => {
    favoritesQueryMock.mockReturnValue({
      data: undefined,
      error: { code: 'UPSTREAM_FAILURE', error: 'Failed' },
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('12345');

    expect(screen.getByText('Failed to load your likes')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Retry'));

    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(notifyApiErrorMock).toHaveBeenCalled();
  });

  it('shows folder sync status inside the dropdown instead of the main content area', () => {
    favoritesQueryMock.mockReturnValue({
      data: [{ permalink_url: 'https://soundcloud.com/test/track', title: 'Track', user: 'Artist' }],
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('12345', {
      directoryName: 'Music',
      files: [{ extension: 'mp3', name: 'Artist - Track' }],
      lastSyncAt: '2026-04-22T09:15:00.000Z',
    });

    expect(screen.getByText('Sync File System')).toBeInTheDocument();
    expect(screen.getByText(/1 files in Music/i)).toBeInTheDocument();
    expect(screen.queryByText(/Last synced/i)).not.toBeInTheDocument();
    expect(screen.getByText('Track List')).toBeInTheDocument();
  });
});
