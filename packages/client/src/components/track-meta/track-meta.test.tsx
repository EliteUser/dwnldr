import { notifications } from '@mantine/notifications';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { dropFiles, jsonResponse, mockApi, renderWithProviders } from '../../test/render';
import { TrackMeta } from './track-meta';

vi.mock('../artwork/artwork', () => ({ Artwork: () => <div>Artwork</div> }));

const tags = { album: 'Album', artwork: null, lyrics: 'Lyrics', name: 'Artist - Track' };
const mp3 = (name = 'track.mp3', type = 'audio/mpeg') => new File(['audio'], name, { type });

describe('TrackMeta', () => {
  it('fills the form from the MP3 tags and exports the edited file', async () => {
    const fetchMock = mockApi({
      '/api/meta/inspect': () => jsonResponse(tags),
      '/api/meta/download': () => new Response('mp3'),
    });
    const { container } = renderWithProviders(<TrackMeta />);

    dropFiles(container, [mp3()]);

    fireEvent.change(await screen.findByDisplayValue('Artist - Track'), { target: { value: 'Artist - New' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ message: 'Saved: Artist - New' })),
    );

    const body = fetchMock.mock.calls.find(([url]) => url === '/api/meta/download')![1]!.body as FormData;

    expect(body.get('name')).toBe('Artist - New');
    expect(body.get('album')).toBe('Album');
    expect(body.get('lyrics')).toBe('Lyrics');
    expect((body.get('audio') as File).name).toBe('track.mp3');
  });

  it('accepts MP3 files without a MIME type', async () => {
    mockApi({ '/api/meta/inspect': () => jsonResponse(tags) });
    const { container } = renderWithProviders(<TrackMeta />);

    dropFiles(container, [mp3('track.mp3', '')]);

    expect(await screen.findByDisplayValue('Artist - Track')).toBeInTheDocument();
  });

  it('clears the form when the file is removed', async () => {
    mockApi({ '/api/meta/inspect': () => jsonResponse(tags) });
    const { container } = renderWithProviders(<TrackMeta />);

    dropFiles(container, [mp3()]);
    await screen.findByDisplayValue('Artist - Track');
    fireEvent.click(screen.getByRole('button', { name: 'Remove selected audio file' }));

    expect(screen.queryByDisplayValue('Artist - Track')).not.toBeInTheDocument();
    expect(screen.getByText('Upload an MP3 to start.')).toBeInTheDocument();
  });

  it('ignores an inspection that finishes after another file was picked', async () => {
    let finishFirst!: (response: Response) => void;
    mockApi({
      '/api/meta/inspect': (_url, init) =>
        ((init!.body as FormData).get('audio') as File).name === 'first.mp3'
          ? new Promise<Response>((resolve) => {
              finishFirst = resolve;
            })
          : jsonResponse({ ...tags, name: 'Second - Track' }),
    });
    const { container } = renderWithProviders(<TrackMeta />);

    dropFiles(container, [mp3('first.mp3')]);
    await waitFor(() => expect(finishFirst).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Remove selected audio file' }));
    dropFiles(container, [mp3('second.mp3')]);
    await screen.findByDisplayValue('Second - Track');
    finishFirst(jsonResponse({ ...tags, name: 'First - Track' }));

    await waitFor(() => expect(screen.getByDisplayValue('Second - Track')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('First - Track')).not.toBeInTheDocument();
  });
});
