import { notifications } from '@mantine/notifications';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import { jsonResponse, mockApi, renderWithProviders } from '../../test/render';
import { Likes } from './likes';

vi.mock('../track-list/track-list', () => ({
  TrackList: ({ tracks }: { tracks: Array<{ title: string }> }) => (
    <div>{tracks.map(({ title }) => title).join(',')}</div>
  ),
}));
vi.mock('../../utils/folder', () => ({ canUseFileSystemAccess: () => true }));

const profileUrl = 'https://soundcloud.com/artist';
const track = {
  id: '1',
  url: 'https://soundcloud.com/a/t',
  title: 'Track',
  artist: 'A',
  durationMs: 1,
  artworkUrl: null,
};

const renderLikes = (state: Partial<ReturnType<typeof useAppStore.getState>> = {}) => {
  useAppStore.setState({ directoryName: null, files: [], profileUrl, ...state });

  return renderWithProviders(<Likes onDownloadClick={() => undefined} />);
};

describe('Likes', () => {
  it('asks for a profile when none is configured', () => {
    mockApi({});

    renderLikes({ profileUrl: null });

    expect(screen.getByText('Add your SoundCloud profile link in Settings to load your likes')).toBeInTheDocument();
  });

  it('loads the likes of the saved profile', async () => {
    const fetchMock = mockApi({ '/api/likes': () => jsonResponse([track]) });

    renderLikes({ directoryName: 'Music' });

    expect(await screen.findByText('Track')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/likes?${new URLSearchParams({ url: profileUrl })}`, expect.anything());
  });

  it('points to folder setup when likes exist without a synced folder', async () => {
    mockApi({ '/api/likes': () => jsonResponse([track]) });

    renderLikes();

    expect(await screen.findByText('Pick a download location in Settings')).toBeInTheDocument();
  });

  it('shows the failure and retries on request', async () => {
    let failing = true;
    mockApi({
      '/api/likes': () =>
        failing ? jsonResponse({ code: 'UPSTREAM_FAILURE', error: 'Down' }, 502) : jsonResponse([track]),
    });

    renderLikes({ directoryName: 'Music' });

    expect(await screen.findByText('Failed to load your likes')).toBeInTheDocument();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Could not reach this source right now. Try again later.' }),
    );

    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Track')).toBeInTheDocument());
  });

  it('shows an empty state for a profile without likes', async () => {
    mockApi({ '/api/likes': () => jsonResponse([]) });

    renderLikes();

    expect(await screen.findByText('No liked tracks found')).toBeInTheDocument();
  });
});
