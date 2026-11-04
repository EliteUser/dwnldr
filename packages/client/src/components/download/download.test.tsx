import { notifications } from '@mantine/notifications';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { jsonResponse, mockApi, renderWithProviders } from '../../test/render';
import { Download } from './download';

vi.mock('../artwork/artwork', () => ({
  Artwork: ({ onArtworkChange }: { onArtworkChange: (file?: File) => void }) => (
    <button type='button' onClick={() => onArtworkChange(new File(['img'], 'artwork.png', { type: 'image/png' }))}>
      Use custom artwork
    </button>
  ),
}));

const trackUrl = 'https://soundcloud.com/artist/track';
const track = {
  id: '1',
  url: trackUrl,
  title: 'Track One',
  artist: 'Artist',
  durationMs: 1000,
  artworkUrl: null,
};

const mockTrackApi = (downloadResponse = () => new Response('mp3', { status: 200 })) =>
  mockApi({
    '/api/providers': () => jsonResponse([{ key: 'youtube', label: 'YouTube' }]),
    '/api/tracks': () => jsonResponse(track),
    '/api/download': downloadResponse,
  });

describe('Download', () => {
  it('downloads with the source artwork when no custom image is selected', async () => {
    const fetchMock = mockTrackApi();
    renderWithProviders(<Download selectedUrl={trackUrl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Saved: Artist - Track One' }),
      ),
    );
    const body = fetchMock.mock.calls.find(([url]) => url === '/api/download')![1]!.body as FormData;
    expect(body.get('url')).toBe(trackUrl);
    expect(body.get('artwork')).toBeNull();
  });

  it('lists the supported providers before a link is entered', async () => {
    mockTrackApi();

    renderWithProviders(<Download />);

    expect(await screen.findByText('YouTube')).toBeInTheDocument();
  });

  it('loads track details for a selected link and downloads them as a form', async () => {
    const fetchMock = mockTrackApi();

    renderWithProviders(<Download selectedUrl={trackUrl} />);

    const nameInput = await screen.findByDisplayValue('Artist - Track One');
    fireEvent.change(nameInput, { target: { value: 'Artist - Renamed' } });
    fireEvent.change(screen.getByPlaceholderText('Album (optional)'), { target: { value: 'Album' } });
    fireEvent.click(screen.getByText('Use custom artwork'));
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(notifications.show).toHaveBeenCalled());

    const [, init] = fetchMock.mock.calls.find(([url]) => String(url) === '/api/download')!;
    const body = init!.body as FormData;

    expect(Object.fromEntries([...body.keys()].map((key) => [key, body.get(key)]))).toEqual({
      url: trackUrl,
      name: 'Artist - Renamed',
      album: 'Album',
      artwork: expect.any(File),
    });
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ message: 'Saved: Artist - Renamed' }));
  });

  it('shows the server message when a download is rejected', async () => {
    mockTrackApi(() => jsonResponse({ code: 'UPSTREAM_FAILURE', error: 'Down' }, 502));

    renderWithProviders(<Download selectedUrl={trackUrl} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));

    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Could not reach this source right now. Try again later.' }),
      ),
    );
  });

  it('reports links the server does not support', async () => {
    mockApi({
      '/api/providers': () => jsonResponse([]),
      '/api/tracks': () => jsonResponse({ code: 'UNSUPPORTED_SOURCE', error: 'This link is not supported.' }, 400),
    });

    renderWithProviders(<Download selectedUrl='https://example.com/track' />);

    expect(await screen.findByText('Track details could not be loaded.')).toBeInTheDocument();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'This link is not supported.' }),
    );
  });
});
