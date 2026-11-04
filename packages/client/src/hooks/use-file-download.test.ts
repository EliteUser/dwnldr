import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Common from '../utils/common';
import { saveBlob } from '../utils/common';
import { getDownloadFolder, saveToFolder } from '../utils/folder';
import { notify } from '../utils/notify';
import { useFileDownload } from './use-file-download';

vi.mock('../utils/common', async (importOriginal) => ({
  ...(await importOriginal<typeof Common>()),
  saveBlob: vi.fn(),
}));
vi.mock('../utils/folder', () => ({ getDownloadFolder: vi.fn(), saveToFolder: vi.fn() }));
vi.mock('../utils/notify', () => ({ notify: { info: vi.fn(), error: vi.fn(), success: vi.fn(), apiError: vi.fn() } }));

const directory = { name: 'Music' } as FileSystemDirectoryHandle;

describe('useFileDownload', () => {
  beforeEach(() => {
    vi.mocked(getDownloadFolder).mockReset().mockResolvedValue(null);
    vi.mocked(saveToFolder).mockReset().mockResolvedValue('Server Name.mp3');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('mp3', {
          headers: { 'Content-Disposition': "attachment; filename*=UTF-8''Server%20Name.mp3" },
        }),
      ),
    );
  });

  it('asks for the folder before the request and saves there using the server filename', async () => {
    vi.mocked(getDownloadFolder).mockImplementation(async () => {
      expect(fetch).not.toHaveBeenCalled();
      return directory;
    });
    const { result } = renderHook(() => useFileDownload('/api/download'));

    await act(() => result.current.download(new FormData(), 'Track'));

    expect(saveToFolder).toHaveBeenCalledWith(directory, 'Server Name.mp3', expect.anything());
    expect(saveBlob).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith('Saved to Music: Server Name.mp3');
  });

  it('uses browser downloads when folder saving is disabled', async () => {
    const { result } = renderHook(() => useFileDownload('/api/download'));
    await act(() => result.current.download(new FormData(), 'Track'));
    expect(saveBlob).toHaveBeenCalledWith('Server Name.mp3', expect.anything());
    expect(saveToFolder).not.toHaveBeenCalled();
  });

  it('falls back to browser downloads when folder permission is denied', async () => {
    vi.mocked(getDownloadFolder).mockRejectedValue(new Error('Denied'));
    const { result } = renderHook(() => useFileDownload('/api/download'));
    await act(() => result.current.download(new FormData(), 'Track'));
    expect(notify.info).toHaveBeenCalledWith(expect.stringContaining('Pick the folder again in Settings'));
    expect(saveBlob).toHaveBeenCalledOnce();
  });

  it('falls back to browser downloads when writing to the folder fails', async () => {
    vi.mocked(getDownloadFolder).mockResolvedValue(directory);
    vi.mocked(saveToFolder).mockRejectedValue(new DOMException('Full', 'QuotaExceededError'));
    const { result } = renderHook(() => useFileDownload('/api/download'));
    await act(() => result.current.download(new FormData(), 'Track'));
    expect(fetch).toHaveBeenCalledOnce();
    expect(saveBlob).toHaveBeenCalledOnce();
    expect(notify.info).toHaveBeenCalledWith(expect.stringContaining('Could not write'));
  });
});
