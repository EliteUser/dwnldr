import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Download } from './download';

const providerTrackQueryMock = vi.fn();
const notifyApiErrorMock = vi.fn();
const notifyErrorMock = vi.fn();
const notifySuccessMock = vi.fn();

vi.mock('@gravity-ui/uikit', () => {
  const DisclosureMock = ({ children, summary }: { children?: ReactNode; summary?: ReactNode }) => (
    <section>
      <div>{summary}</div>
      <div>{children}</div>
    </section>
  );
  DisclosureMock.Details = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    Button: ({
      children,
      disabled,
      onClick,
      ...props
    }: {
      children?: ReactNode;
      disabled?: boolean;
      onClick?: () => void;
    }) => (
      <button disabled={disabled} onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Disclosure: DisclosureMock,
    Icon: () => null,
    Loader: () => <div>Loading</div>,
    Progress: ({ value }: { value?: number }) => <div>{value ?? 0}</div>,
    SegmentedRadioGroup: ({
      disabled,
      onUpdate,
      options,
      value,
    }: {
      disabled?: boolean;
      onUpdate?: (value: string) => void;
      options?: Array<{ content?: ReactNode; value: string }>;
      value?: string;
    }) => (
      <div>
        {options?.map((option) => (
          <button
            disabled={disabled}
            key={option.value}
            type='button'
            aria-pressed={option.value === value}
            onClick={() => onUpdate?.(option.value)}
          >
            {option.content}
          </button>
        ))}
      </div>
    ),
    Sheet: ({ children, visible }: { children?: ReactNode; visible?: boolean }) =>
      visible ? <div>{children}</div> : null,
    Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
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
  };
});

vi.mock('@gravity-ui/icons', () => ({
  ArrowRotateLeft: {},
  ArrowShapeDownToLine: {},
  ArrowShapeUpFromLine: {},
  Pencil: {},
}));

vi.mock('../../api/api', () => ({
  useGetProviderTrackQuery: (...args: unknown[]) => providerTrackQueryMock(...args),
}));

vi.mock('../../utils/notify/notify.constants', () => ({
  DOWNLOAD_NOTIFICATION_MESSAGE: {
    success: (name: string) => `Track downloaded: ${name}`,
  },
  DOWNLOAD_NOTIFICATION_NAME: {
    metadataError: 'download-metadata-error',
    submitError: 'download-submit-error',
    missingBody: 'download-missing-body',
    networkError: 'download-network-error',
    success: 'download-success',
  },
  FALLBACK_API_ERROR_MESSAGE: 'Something went wrong. Try again.',
}));

vi.mock('../../utils/notify/notify.utils', () => ({
  getApiErrorFromQueryError: (error: unknown) => error,
  parseApiErrorResponse: async () => ({ code: 'INTERNAL_ERROR', error: 'Failed' }),
  useNotify: () => ({
    apiError: notifyApiErrorMock,
    error: notifyErrorMock,
    success: notifySuccessMock,
  }),
}));

describe('Download', () => {
  beforeEach(() => {
    providerTrackQueryMock.mockReturnValue({
      currentData: undefined,
      error: undefined,
      isFetching: false,
      provider: undefined,
    });
    notifyApiErrorMock.mockReset();
    notifyErrorMock.mockReset();
    notifySuccessMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('debounces metadata requests while the URL is being typed', () => {
    vi.useFakeTimers();

    render(<Download />);

    fireEvent.change(screen.getByPlaceholderText('Enter track URL'), {
      target: { value: 'https://soundcloud.com/artist/track' },
    });

    expect(providerTrackQueryMock.mock.calls.some(([url]) => url === 'https://soundcloud.com/artist/track')).toBe(
      false,
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(providerTrackQueryMock.mock.calls.some(([url]) => url === 'https://soundcloud.com/artist/track')).toBe(true);
  });

  it('clears form fields when a different likes-track URL is selected', () => {
    providerTrackQueryMock.mockReturnValue({
      currentData: {
        user: 'Artist',
        title: 'Track One',
      },
      error: undefined,
      isFetching: false,
      provider: undefined,
    });

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

    providerTrackQueryMock.mockReturnValue({
      currentData: undefined,
      error: undefined,
      isFetching: true,
      provider: undefined,
    });

    rerender(<Download selectedUrl='https://soundcloud.com/artist/track-two' />);

    expect(screen.queryByPlaceholderText('Track name')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Album (optional)')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Lyrics (optional)')).not.toBeInTheDocument();
  });

  it('aborts an in-progress download when Cancel is clicked', async () => {
    providerTrackQueryMock.mockReturnValue({
      currentData: {
        user: 'Artist',
        title: 'Track Name',
      },
      error: undefined,
      isFetching: false,
      provider: undefined,
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
    const loadedTrackQuery = {
      currentData: {
        user: 'Artist',
        title: 'Track One',
      },
      error: undefined,
      isFetching: false,
      provider: undefined,
    };

    providerTrackQueryMock
      .mockReturnValueOnce(loadedTrackQuery)
      .mockReturnValueOnce(loadedTrackQuery)
      .mockReturnValue({
        data: {
          user: 'Artist',
          title: 'Track One',
        },
        currentData: undefined,
        error: undefined,
        isFetching: true,
        provider: undefined,
      });

    const { rerender } = render(<Download selectedUrl='https://soundcloud.com/artist/track-one' />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track One');
    });

    rerender(<Download selectedUrl='https://soundcloud.com/artist/track-two' />);

    expect(screen.queryByPlaceholderText('Track name')).not.toBeInTheDocument();
  });

  it('does not block metadata editing while provider artwork is loading', async () => {
    providerTrackQueryMock.mockReturnValue({
      currentData: {
        artwork: {
          url: 'https://img.example.test/cover.jpg',
        },
        artwork_url: 'https://img.example.test/cover.jpg',
        user: 'Artist',
        title: 'Track Name',
      },
      error: undefined,
      isFetching: false,
      provider: undefined,
    });

    render(<Download selectedUrl='https://soundcloud.com/artist/track' />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track Name');
    });
  });

  it('uses the browser download flow without opening the save file picker', async () => {
    providerTrackQueryMock.mockReturnValue({
      currentData: {
        user: 'Artist',
        title: 'Track Name',
      },
      error: undefined,
      isFetching: false,
      provider: undefined,
    });

    const anchorClickMock = vi.fn();
    const createObjectURLMock = vi.fn(() => 'blob:download');
    const revokeObjectURLMock = vi.fn();
    const showSaveFilePickerMock = vi.fn();
    const appendChildMock = vi.spyOn(document.body, 'appendChild');
    const removeChildMock = vi.spyOn(document.body, 'removeChild');

    vi.stubGlobal('showSaveFilePicker', showSaveFilePickerMock);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: {
            'content-disposition': 'attachment; filename="track.mp3"',
            'content-length': '3',
          },
          status: 200,
        }),
      ),
    );
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLAnchorElement;

      if (tagName === 'a') {
        element.click = anchorClickMock;
      }

      return element;
    });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectURLMock);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURLMock);

    render(<Download selectedUrl='https://soundcloud.com/artist/track' />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track Name');
    });

    fireEvent.click(screen.getByText(/download/i));

    await waitFor(() => {
      expect(anchorClickMock).toHaveBeenCalledTimes(1);
    });

    expect(showSaveFilePickerMock).not.toHaveBeenCalled();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:download');
    expect(appendChildMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
    expect(notifySuccessMock).toHaveBeenCalledWith('Track downloaded: Artist - Track Name', {
      name: 'download-success',
    });
  });
});
