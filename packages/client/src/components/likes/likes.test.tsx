import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import { Likes } from './likes';

const favoritesQueryMock = vi.fn();
const notifyApiErrorMock = vi.fn();
const notifyErrorMock = vi.fn();
const notifyInfoMock = vi.fn();
const notifySuccessMock = vi.fn();
const refetchMock = vi.fn();
const syncFolderMock = vi.fn(async () => ({ status: 'success', directoryName: 'Music', fileCount: 1 }));
const selectFolderMock = vi.fn(async () => ({ status: 'success', directoryName: 'Music', fileCount: 1 }));

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

vi.mock('../../api/api', () => ({
  useGetFavoritesQuery: (...args: unknown[]) => favoritesQueryMock(...args),
}));

vi.mock('../../store/folder.actions', () => ({
  selectFolder: () => selectFolderMock(),
  syncFolder: () => syncFolderMock(),
}));

vi.mock('../../utils/folder/folder.utils', () => ({
  FILE_SYSTEM_ACCESS_HELP_TEXT: 'Folder sync help',
  canUseFileSystemAccess: () => true,
}));

vi.mock('../../utils/notify/notify.utils', () => ({
  getApiErrorFromQueryError: (error: unknown) => error,
  useNotify: () => ({
    apiError: notifyApiErrorMock,
    error: notifyErrorMock,
    info: notifyInfoMock,
    success: notifySuccessMock,
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
    isFolderSyncInProgress?: boolean;
    lastSyncAt?: string | null;
  },
) => {
  useAppStore.setState({
    directoryName: filesState?.directoryName ?? null,
    files: filesState?.files ?? [],
    isFolderSyncInProgress: filesState?.isFolderSyncInProgress ?? false,
    lastSyncAt: filesState?.lastSyncAt ?? null,
    userId,
  });

  return render(<Likes onDownloadClick={() => undefined} onFavoritesCountChange={() => undefined} />);
};

describe('Likes', () => {
  beforeEach(() => {
    favoritesQueryMock.mockReset();
    notifyApiErrorMock.mockReset();
    notifyErrorMock.mockReset();
    notifyInfoMock.mockReset();
    notifySuccessMock.mockReset();
    refetchMock.mockReset();
    syncFolderMock.mockClear();
    selectFolderMock.mockClear();
    useAppStore.setState({
      directoryName: null,
      files: [],
      isFolderSyncInProgress: false,
      lastSyncAt: null,
      userId: null,
    });
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
