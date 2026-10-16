import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import { Likes } from './likes';

const favoritesQueryMock = vi.fn();
const notifyApiErrorMock = vi.fn();
const notifyErrorMock = vi.fn();
const notifyInfoMock = vi.fn();
const notifySuccessMock = vi.fn();
const refetchMock = vi.fn();
const syncFolderMock = vi.fn(async () => ({
  directoryName: 'Music',
  fileCount: 1,
  status: 'success' as const,
}));

vi.mock('../../api/api', () => ({
  useGetFavoritesQuery: (...args: unknown[]) => favoritesQueryMock(...args),
}));

vi.mock('../../store/folder.actions', () => ({
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

const renderLikes = (
  profileUrl: string | null,
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
    profileUrl,
  });

  return render(<Likes onDownloadClick={() => undefined} />);
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
    useAppStore.setState({
      directoryName: null,
      files: [],
      isFolderSyncInProgress: false,
      lastSyncAt: null,
      profileUrl: null,
    });
  });

  it('points account setup to Settings when no user is configured', () => {
    favoritesQueryMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes(null);

    expect(screen.getByText('Add your SoundCloud profile link in Settings to load your likes')).toBeInTheDocument();
  });

  it('shows a retry state when loading likes fails', () => {
    favoritesQueryMock.mockReturnValue({
      data: undefined,
      error: { code: 'UPSTREAM_FAILURE', error: 'Failed' },
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile');

    expect(screen.getByText('Failed to load your likes')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Retry'));

    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(notifyApiErrorMock).toHaveBeenCalled();
  });

  it('announces the initial likes loading state', () => {
    favoritesQueryMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile');

    expect(screen.getByRole('status')).toHaveTextContent('Loading your likes...');
  });

  it('announces a cached list refresh without hiding the list', () => {
    favoritesQueryMock.mockReturnValue({
      data: [{ permalink_url: 'https://soundcloud.com/test/track', title: 'Track', user: 'Artist' }],
      error: undefined,
      isFetching: true,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile', { directoryName: 'Music' });

    expect(screen.getByRole('status')).toHaveTextContent('Refreshing your likes...');
    expect(screen.getByText('Track List')).toBeInTheDocument();
  });

  it('keeps cached likes visible after a background refresh fails and retries in place', () => {
    favoritesQueryMock.mockReturnValue({
      data: [{ permalink_url: 'https://soundcloud.com/test/track', title: 'Track', user: 'Artist' }],
      error: { code: 'UPSTREAM_FAILURE', error: 'Failed' },
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile', { directoryName: 'Music' });

    expect(screen.getByText('Track List')).toBeInTheDocument();
    expect(screen.getByText('Could not refresh your likes. Showing the last loaded results.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load your likes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a cached empty state visible after a background refresh fails', () => {
    favoritesQueryMock.mockReturnValue({
      data: [],
      error: { code: 'UPSTREAM_FAILURE', error: 'Failed' },
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile');

    expect(screen.getByText('No liked tracks found')).toBeInTheDocument();
    expect(screen.getByText('Could not refresh your likes. Showing the last loaded results.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load your likes')).not.toBeInTheDocument();
  });

  it('renders the track list when a profile and favorites are configured', () => {
    favoritesQueryMock.mockReturnValue({
      data: [{ permalink_url: 'https://soundcloud.com/test/track', title: 'Track', user: 'Artist' }],
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile', {
      directoryName: 'Music',
      files: [{ extension: 'mp3', name: 'Artist - Track' }],
      lastSyncAt: '2026-04-22T09:15:00.000Z',
    });

    expect(screen.getByText('Track List')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('points folder setup to Settings when favorites exist without a folder', () => {
    favoritesQueryMock.mockReturnValue({
      data: [{ permalink_url: 'https://soundcloud.com/test/track', title: 'Track', user: 'Artist' }],
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile');

    expect(screen.getByText('Pick a download location in Settings')).toBeInTheDocument();
  });

  it('does not request folder sync when Likes renders with a selected folder', () => {
    favoritesQueryMock.mockReturnValue({
      data: [{ permalink_url: 'https://soundcloud.com/test/track', title: 'Track', user: 'Artist' }],
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    renderLikes('https://soundcloud.com/my-profile', {
      directoryName: 'Music',
      files: [{ extension: 'mp3', name: 'Artist - Track' }],
      lastSyncAt: '2026-04-22T09:15:00.000Z',
    });

    expect(syncFolderMock).not.toHaveBeenCalled();
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });
});
