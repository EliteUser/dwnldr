import { notifications } from '@mantine/notifications';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import { jsonResponse, mockApi, renderWithProviders } from '../../test/render';
import type { FolderSyncResult } from '../../utils/folder';
import { Settings } from './settings';

const { canUseFileSystemAccessMock, selectFolderMock, syncFolderMock } = vi.hoisted(() => ({
  canUseFileSystemAccessMock: vi.fn(() => true),
  selectFolderMock: vi.fn<() => Promise<FolderSyncResult>>(),
  syncFolderMock: vi.fn<() => Promise<FolderSyncResult>>(),
}));

vi.mock('../../utils/folder', () => ({
  canUseFileSystemAccess: canUseFileSystemAccessMock,
  selectFolder: selectFolderMock,
  syncFolder: syncFolderMock,
}));

const success: FolderSyncResult = { ok: true, directoryName: 'Music', fileCount: 2 };

describe('Settings', () => {
  beforeEach(() => {
    useAppStore.setState({ directoryName: null, saveDownloadsToFolder: false, isFolderSyncInProgress: false });
  });

  it('enables saving to the indexed folder and allows returning to browser downloads', () => {
    mockApi({});
    useAppStore.setState({ directoryName: 'Music' });
    renderWithProviders(<Settings />);

    const toggle = screen.getByRole('switch', { name: /Save downloads to this folder/ });
    fireEvent.click(toggle);
    expect(useAppStore.getState().saveDownloadsToFolder).toBe(true);
    fireEvent.click(toggle);
    expect(useAppStore.getState().saveDownloadsToFolder).toBe(false);
  });

  it('requires a folder before enabling folder downloads', () => {
    mockApi({});
    renderWithProviders(<Settings />);
    expect(screen.getByRole('switch', { name: /Save downloads to this folder/ })).toBeDisabled();
  });

  it('shows the synced folder and syncs it with a progress notification', async () => {
    mockApi({});
    syncFolderMock.mockResolvedValue(success);
    useAppStore.setState({ directoryName: 'Music', files: [{ name: 'a', extension: 'mp3' }], lastSyncAt: null });

    renderWithProviders(<Settings />);

    expect(screen.getByText('1 files indexed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sync Folder' }));

    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'folder-sync', loading: true }));
    await waitFor(() =>
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'folder-sync', color: 'green', message: '2 files found in Music' }),
      ),
    );
  });

  it('reports a failed folder pick and stays quiet when the picker is cancelled', async () => {
    mockApi({});
    selectFolderMock.mockResolvedValueOnce({ ok: false, message: 'Folder permission was not granted.' });
    selectFolderMock.mockResolvedValueOnce({ ok: false, message: null });

    renderWithProviders(<Settings />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Folder' }));
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Folder permission was not granted.' }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick Folder' }));
    await waitFor(() => expect(selectFolderMock).toHaveBeenCalledTimes(2));
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });

  it('explains when the browser cannot sync folders', () => {
    mockApi({ '/api/profile': () => jsonResponse({}) });
    canUseFileSystemAccessMock.mockReturnValueOnce(false);

    renderWithProviders(<Settings />);

    expect(screen.getByText('File System Access unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pick Folder' })).not.toBeInTheDocument();
  });
});
