import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import type { FolderSyncResult } from '../../store/folder.actions';
import { Settings } from './settings';

const notifyErrorMock = vi.fn();
const notifyInfoMock = vi.fn();
const notifySuccessMock = vi.fn();
const selectFolderMock = vi.fn<() => Promise<FolderSyncResult>>(async () => ({
  status: 'success',
  directoryName: 'Music',
  fileCount: 2,
}));
const syncFolderMock = vi.fn<() => Promise<FolderSyncResult>>(async () => ({
  status: 'success',
  directoryName: 'Music',
  fileCount: 2,
}));

vi.mock('@gravity-ui/uikit', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Disclosure: Object.assign(
    ({ children, summary }: { children?: ReactNode; defaultExpanded?: boolean; summary?: ReactNode }) => (
      <section>
        <header>{summary}</header>
        {children}
      </section>
    ),
    {
      Details: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    },
  ),
  Icon: () => null,
  Progress: () => <div>Progress</div>,
  Text: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@gravity-ui/icons', () => ({
  FolderArrowUpIn: {},
  FolderOpen: {},
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
  useNotify: () => ({
    error: notifyErrorMock,
    info: notifyInfoMock,
    success: notifySuccessMock,
  }),
}));

vi.mock('../user-input/user-input', () => ({
  UserInput: () => <div>SoundCloud Account Linkage</div>,
}));

describe('Settings', () => {
  beforeEach(() => {
    notifyErrorMock.mockReset();
    notifyInfoMock.mockReset();
    notifySuccessMock.mockReset();
    selectFolderMock.mockClear();
    syncFolderMock.mockClear();
    useAppStore.setState({
      directoryName: 'Music',
      files: [
        { extension: 'mp3', name: 'Artist - Track' },
        { extension: 'mp3', name: 'Artist - Track 2' },
      ],
      isFolderSyncInProgress: false,
      lastSyncAt: '2026-04-22T09:15:00.000Z',
      userId: '12345',
    });
  });

  it('renders service account linkage and sync folder settings', () => {
    render(<Settings />);

    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('SoundCloud')).toBeInTheDocument();
    expect(screen.getByText('SoundCloud Account Linkage')).toBeInTheDocument();
    expect(screen.queryByText('Download Folder')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sync Folder')).toHaveLength(2);
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText(/2 files indexed/i)).toBeInTheDocument();
  });

  it('runs folder selection and sync actions', async () => {
    render(<Settings />);

    fireEvent.click(screen.getByText('Pick Folder'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync Folder' }));

    expect(selectFolderMock).toHaveBeenCalledTimes(1);
    expect(syncFolderMock).toHaveBeenCalledTimes(1);
  });

  it('notifies when folder permission is denied', async () => {
    selectFolderMock.mockResolvedValueOnce({ status: 'permission-denied' });
    syncFolderMock.mockResolvedValueOnce({ status: 'permission-denied' });

    render(<Settings />);

    fireEvent.click(screen.getByText('Pick Folder'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync Folder' }));

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith(
        'Folder permission was not granted. Pick the folder again in Settings.',
        {
          name: 'folder-permission-denied',
        },
      );
    });
    expect(selectFolderMock).toHaveBeenCalledTimes(1);
    expect(syncFolderMock).toHaveBeenCalledTimes(1);
  });
});
