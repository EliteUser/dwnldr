import type { ReactNode } from 'react';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Download } from './download';

const soundCloudQueryMock = vi.fn();
const youTubeQueryMock = vi.fn();
const notifyApiErrorMock = vi.fn();
const notifyErrorMock = vi.fn();
const notifySuccessMock = vi.fn();

vi.mock('@gravity-ui/uikit', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Icon: () => null,
  Label: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Loader: () => <div>Loading</div>,
  Progress: ({ value }: { value?: number }) => <div>{value ?? 0}</div>,
  TextArea: ({
    onChange,
    placeholder,
    value,
  }: {
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    value?: string;
  }) => <textarea placeholder={placeholder} value={value} onChange={(event) => onChange?.(event as never)} />,
  TextInput: ({
    onChange,
    placeholder,
    value,
  }: {
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    value?: string;
  }) => <input placeholder={placeholder} value={value} onChange={(event) => onChange?.(event as never)} />,
}));

vi.mock('@gravity-ui/icons', () => ({
  ArrowShapeDownToLine: {},
}));

vi.mock('../../api/api.slice', () => ({
  useGetSoundCloudTracksQuery: (...args: unknown[]) => soundCloudQueryMock(...args),
  useGetYoutubeTracksQuery: (...args: unknown[]) => youTubeQueryMock(...args),
}));

vi.mock('../../utils/common.utils', () => ({
  classifySource: (url: string) => {
    if (url.includes('soundcloud')) {
      return 'soundcloud';
    }

    if (url.includes('youtube') || url.includes('youtu.be')) {
      return 'youtube';
    }

    return null;
  },
}));

vi.mock('../../utils/notify.constants', () => ({
  DOWNLOAD_NOTIFICATION_MESSAGE: {
    filePickerError: 'Failed to open the save dialog.',
    success: (name: string) => `Track downloaded: ${name}`,
  },
  DOWNLOAD_NOTIFICATION_NAME: {
    filePickerError: 'download-file-picker-error',
    metadataError: 'download-metadata-error',
    submitError: 'download-submit-error',
    missingBody: 'download-missing-body',
    networkError: 'download-network-error',
    success: 'download-success',
  },
  FALLBACK_API_ERROR_MESSAGE: 'Something went wrong on the server.',
}));

vi.mock('../../utils/notify.utils', () => ({
  getApiErrorFromRtkError: (error: unknown) => error,
  parseApiErrorResponse: async () => ({ code: 'INTERNAL_ERROR', error: 'Failed' }),
  useNotify: () => ({
    apiError: notifyApiErrorMock,
    error: notifyErrorMock,
    success: notifySuccessMock,
  }),
}));

describe('Download', () => {
  beforeEach(() => {
    soundCloudQueryMock.mockReturnValue({
      currentData: undefined,
      error: undefined,
      isFetching: false,
    });
    youTubeQueryMock.mockReturnValue({
      currentData: undefined,
      error: undefined,
      isFetching: false,
    });
    notifyApiErrorMock.mockReset();
    notifyErrorMock.mockReset();
    notifySuccessMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('debounces metadata requests while the URL is being typed', () => {
    vi.useFakeTimers();

    render(<Download />);

    fireEvent.change(screen.getByPlaceholderText('Enter track URL'), {
      target: { value: 'https://soundcloud.com/artist/track' },
    });

    expect(soundCloudQueryMock.mock.calls.some(([url]) => url === 'https://soundcloud.com/artist/track')).toBe(false);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(soundCloudQueryMock.mock.calls.some(([url]) => url === 'https://soundcloud.com/artist/track')).toBe(true);
  });

  it('clears form fields when a different likes-track URL is selected', () => {
    const { rerender } = render(<Download selectedUrl='https://soundcloud.com/artist/track-one' />);

    fireEvent.change(screen.getByPlaceholderText('Track name'), {
      target: { value: 'Artist - Track One' },
    });
    fireEvent.change(screen.getByPlaceholderText('Album (optional)'), {
      target: { value: 'Album Name' },
    });
    fireEvent.change(screen.getByPlaceholderText('Lyrics (optional)'), {
      target: { value: 'Lyrics text' },
    });

    rerender(<Download selectedUrl='https://soundcloud.com/artist/track-two' />);

    expect(screen.getByPlaceholderText('Track name')).toHaveValue('');
    expect(screen.getByPlaceholderText('Album (optional)')).toHaveValue('');
    expect(screen.getByPlaceholderText('Lyrics (optional)')).toHaveValue('');
  });

  it('aborts an in-progress download when Cancel is clicked', async () => {
    soundCloudQueryMock.mockReturnValue({
      currentData: {
        user: 'Artist',
        title: 'Track Name',
      },
      error: undefined,
      isFetching: false,
    });

    let requestSignal: AbortSignal | undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        requestSignal = options?.signal ?? undefined;

        return new Promise((_resolve, reject) => {
          requestSignal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        });
      }),
    );

    render(<Download selectedUrl='https://soundcloud.com/artist/track' />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track Name');
    });

    fireEvent.click(screen.getByText(/download/i));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(requestSignal?.aborted).toBe(true);
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  it('does not repopulate the name field from stale query data while a new URL is loading', async () => {
    soundCloudQueryMock
      .mockReturnValueOnce({
        currentData: {
          user: 'Artist',
          title: 'Track One',
        },
        error: undefined,
        isFetching: false,
      })
      .mockReturnValue({
        data: {
          user: 'Artist',
          title: 'Track One',
        },
        currentData: undefined,
        error: undefined,
        isFetching: true,
      });

    const { rerender } = render(<Download selectedUrl='https://soundcloud.com/artist/track-one' />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track One');
    });

    rerender(<Download selectedUrl='https://soundcloud.com/artist/track-two' />);

    expect(screen.getByPlaceholderText('Track name')).toHaveValue('');
  });

  it('shows a local picker error instead of a server error when the save dialog fails', async () => {
    soundCloudQueryMock.mockReturnValue({
      currentData: {
        user: 'Artist',
        title: 'Track Name',
      },
      error: undefined,
      isFetching: false,
    });

    vi.stubGlobal('showSaveFilePicker', vi.fn().mockRejectedValue(new DOMException('Failed', 'SecurityError')));
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });

    render(<Download selectedUrl='https://soundcloud.com/artist/track' />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track Name');
    });

    fireEvent.click(screen.getByText(/download/i));

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith('Failed to open the save dialog.', {
        name: 'download-file-picker-error',
      });
    });
  });
});
