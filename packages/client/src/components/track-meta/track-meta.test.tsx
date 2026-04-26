import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Utils from '../../utils';
import { TrackMeta } from './track-meta';

const notifyApiErrorMock = vi.fn();
const downloadMock = vi.fn();

vi.mock('@gravity-ui/uikit', () => {
  const DisclosureMock = ({ children, summary }: { children?: ReactNode; summary?: ReactNode }) => (
    <section>
      <div>{summary}</div>
      <div>{children}</div>
    </section>
  );
  DisclosureMock.Details = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    Disclosure: DisclosureMock,
    Icon: () => null,
    Loader: () => <div>Loading</div>,
    Progress: ({ value }: { value?: number }) => <div>{value ?? 0}</div>,
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
  ArrowShapeDownToLine: {},
  ArrowShapeUpFromLine: {},
}));

vi.mock('../../components/artwork', () => ({
  Artwork: () => <div>Artwork</div>,
}));

vi.mock('../../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof Utils>();

  return {
    ...actual,
    getApiErrorFromQueryError: (error: unknown) => error,
    useNotify: () => ({
      apiError: notifyApiErrorMock,
    }),
  };
});

vi.mock('./use-track-meta-download', () => ({
  useTrackMetaDownload: () => ({
    cancel: vi.fn(),
    download: downloadMock,
    inProgress: false,
    isProgressKnown: false,
    progress: 0,
  }),
}));

describe('TrackMeta', () => {
  beforeEach(() => {
    notifyApiErrorMock.mockReset();
    downloadMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not let stale inspect responses overwrite the latest selected file', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        (_url: string, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            });
          }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            album: '',
            artwork: null,
            lyrics: '',
            name: 'Second Artist - Second Track',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<TrackMeta />);

    const audioInput = screen.getByLabelText('Upload MP3');

    fireEvent.change(audioInput, {
      target: {
        files: [new File(['first'], 'first.mp3', { type: 'audio/mpeg' })],
      },
    });
    fireEvent.change(audioInput, {
      target: {
        files: [new File(['second'], 'second.mp3', { type: 'audio/mpeg' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Second Artist - Second Track');
    });
    expect(notifyApiErrorMock).not.toHaveBeenCalled();
  });
});
