import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Utils from '../../utils';
import { TrackMeta } from './track-meta';

const notifyApiErrorMock = vi.fn();
const notifyErrorMock = vi.fn();
const downloadMock = vi.fn();

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
      error: notifyErrorMock,
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
    notifyErrorMock.mockReset();
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

    await waitFor(() => {
      expect(screen.getByText('first.mp3')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Remove selected audio file'));

    fireEvent.change(screen.getByLabelText('Upload MP3'), {
      target: {
        files: [new File(['second'], 'second.mp3', { type: 'audio/mpeg' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Second Artist - Second Track');
    });
    expect(notifyApiErrorMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported audio files before inspection', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    render(<TrackMeta />);

    fireEvent.change(screen.getByLabelText('Upload MP3'), {
      target: {
        files: [new File(['text'], 'notes.txt', { type: 'text/plain' })],
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(notifyErrorMock).toHaveBeenCalledWith('Use an MP3 audio file.', {
      name: 'track-meta-invalid-audio',
    });
    expect(screen.getByText('Use an MP3 audio file.')).toBeInTheDocument();
  });

  it('allows MP3 files when the browser does not provide a MIME type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            album: '',
            artwork: null,
            lyrics: '',
            name: 'Artist - Track',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      ),
    );

    render(<TrackMeta />);

    fireEvent.change(screen.getByLabelText('Upload MP3'), {
      target: {
        files: [new File(['audio'], 'track.mp3', { type: '' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track');
    });
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it('removes the selected audio file and clears inspected metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            album: '',
            artwork: null,
            lyrics: '',
            name: 'Artist - Track',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      ),
    );

    render(<TrackMeta />);

    fireEvent.change(screen.getByLabelText('Upload MP3'), {
      target: {
        files: [new File(['audio'], 'track.mp3', { type: 'audio/mpeg' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('track.mp3')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Track name')).toHaveValue('Artist - Track');
    });

    fireEvent.click(screen.getByLabelText('Remove selected audio file'));

    expect(screen.queryByText('track.mp3')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Track name')).not.toBeInTheDocument();
    expect(screen.getByText('Upload an MP3 to start.')).toBeInTheDocument();
  });
});
