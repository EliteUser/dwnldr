import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAppStore } from '../../store';
import { jsonResponse, mockApi, renderWithProviders } from '../../test/render';
import { UserInput } from './user-input';

const profile = { id: '7', name: 'Artist Name', url: 'https://soundcloud.com/artist', avatarUrl: null };

const submit = (value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'SoundCloud profile link' }), { target: { value } });
  fireEvent.submit(screen.getByRole('textbox', { name: 'SoundCloud profile link' }).closest('form')!);
};

describe('UserInput', () => {
  it('rejects text that is not a link', () => {
    mockApi({});
    useAppStore.setState({ profileUrl: null });

    renderWithProviders(<UserInput />);
    submit('artist');

    expect(screen.getByText(/Enter a profile link/)).toBeInTheDocument();
    expect(useAppStore.getState().profileUrl).toBeNull();
  });

  it('saves the link and shows the connected profile', async () => {
    mockApi({ '/api/profile': () => jsonResponse(profile) });
    useAppStore.setState({ profileUrl: null });

    renderWithProviders(<UserInput />);
    submit(' https://soundcloud.com/artist/likes ');

    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/artist/likes');
    expect(await screen.findByText('Artist Name')).toBeInTheDocument();
  });

  it('offers retry and change when the profile cannot be loaded', async () => {
    let failing = true;
    mockApi({
      '/api/profile': () =>
        failing
          ? jsonResponse({ code: 'NOT_FOUND', error: 'SoundCloud profile not found.' }, 404)
          : jsonResponse(profile),
    });
    useAppStore.setState({ profileUrl: 'https://soundcloud.com/missing' });

    renderWithProviders(<UserInput />);

    expect(await screen.findByText('Could not load SoundCloud user.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change profile' })).toBeInTheDocument();

    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Artist Name')).toBeInTheDocument());
  });
});
