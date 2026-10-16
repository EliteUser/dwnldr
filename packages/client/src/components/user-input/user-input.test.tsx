import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../store';
import { UserInput } from './user-input';

const userQueryMock = vi.fn();
const notifyApiErrorMock = vi.fn();
const refetchMock = vi.fn();
const userQueryListeners = new Set<() => void>();
let userQueryRevision = 0;

const subscribeToUserQuery = (listener: () => void) => {
  userQueryListeners.add(listener);

  return () => userQueryListeners.delete(listener);
};

const notifyUserQueryUpdate = () => {
  userQueryRevision += 1;
  userQueryListeners.forEach((listener) => listener());
};

vi.mock('../../api/api', () => ({
  useGetUserQuery: (...args: unknown[]) => {
    useSyncExternalStore(subscribeToUserQuery, () => userQueryRevision);

    return userQueryMock(...args);
  },
}));

vi.mock('../../utils', () => ({
  getApiErrorFromQueryError: (error: unknown) => error,
  getProxiedImageUrl: (url: string | null | undefined) => url || '',
  useNotify: () => ({
    apiError: notifyApiErrorMock,
  }),
}));

describe('UserInput', () => {
  beforeEach(() => {
    userQueryMock.mockReset();
    notifyApiErrorMock.mockReset();
    refetchMock.mockReset();
    userQueryRevision = 0;
    useAppStore.setState({ profileUrl: null });
    userQueryMock.mockImplementation((profileUrl: string) => ({
      data: profileUrl
        ? {
            avatar_url: 'https://img.example.test/avatar.png',
            full_name: 'Artist Name',
          }
        : undefined,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    }));
  });

  it('validates the link before saving a profile URL', () => {
    render(<UserInput />);

    expect(screen.getByRole('textbox', { name: 'SoundCloud profile link' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('https://soundcloud.com/your-name'), {
      target: { value: 'https://soundcloud.com/artist/track-name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a SoundCloud profile link. Track and playlist links are not supported.',
    );
    expect(useAppStore.getState().profileUrl).toBeNull();
  });

  it('saves a normalized profile URL and keeps the profile edit flow', () => {
    render(<UserInput />);

    fireEvent.change(screen.getByPlaceholderText('https://soundcloud.com/your-name'), {
      target: { value: 'http://www.soundcloud.com/artist/likes?utm_source=app' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/artist');
    expect(screen.getByText('Artist Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change SoundCloud profile' })).toHaveFocus();
    expect(userQueryMock).toHaveBeenLastCalledWith('https://soundcloud.com/artist', { skip: false });

    fireEvent.click(screen.getByRole('button', { name: 'Change SoundCloud profile' }));

    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/artist');
    expect(screen.getByPlaceholderText('https://soundcloud.com/your-name')).toHaveValue(
      'https://soundcloud.com/artist',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/artist');
    expect(screen.getByRole('button', { name: 'Change SoundCloud profile' })).toHaveFocus();
  });

  it('focuses the stable profile control after the initial lookup resolves', () => {
    let lookupResolved = false;
    userQueryMock.mockImplementation((profileUrl: string) => {
      if (!profileUrl) {
        return { isLoading: false };
      }

      return lookupResolved
        ? {
            data: { avatar_url: 'https://img.example.test/avatar.png', full_name: 'Artist Name' },
            error: undefined,
            isFetching: false,
            isLoading: false,
            refetch: refetchMock,
          }
        : {
            data: undefined,
            error: undefined,
            isFetching: true,
            isLoading: true,
            refetch: refetchMock,
          };
    });

    render(<UserInput />);

    fireEvent.change(screen.getByPlaceholderText('https://soundcloud.com/your-name'), {
      target: { value: 'https://soundcloud.com/artist' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(screen.getByRole('status')).toHaveTextContent('Loading SoundCloud profile...');
    expect(screen.getByRole('button', { name: 'Change profile' })).not.toHaveFocus();

    lookupResolved = true;
    act(() => notifyUserQueryUpdate());

    expect(screen.getByRole('button', { name: 'Change SoundCloud profile' })).toHaveFocus();
  });

  it('keeps the saved profile when an edited link fails validation', () => {
    useAppStore.setState({ profileUrl: 'https://soundcloud.com/saved-artist' });

    render(<UserInput />);

    fireEvent.click(screen.getByRole('button', { name: 'Change SoundCloud profile' }));
    const profileInput = screen.getByRole('textbox', { name: 'SoundCloud profile link' });

    expect(profileInput).toHaveValue('https://soundcloud.com/saved-artist');
    expect(profileInput).toHaveFocus();

    fireEvent.change(profileInput, { target: { value: 'https://soundcloud.com/artist/track-name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a SoundCloud profile link. Track and playlist links are not supported.',
    );
    expect(profileInput).toHaveFocus();
    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/saved-artist');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/saved-artist');
    expect(screen.getByRole('button', { name: 'Change SoundCloud profile' })).toHaveFocus();
  });

  it('shows a useful recovery action when profile lookup fails', () => {
    useAppStore.setState({ profileUrl: 'https://soundcloud.com/missing-profile' });
    userQueryMock.mockReturnValue({
      data: undefined,
      error: { error: 'Profile not found' },
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<UserInput />);

    expect(screen.getByText('Could not load SoundCloud user.')).toBeInTheDocument();
    expect(notifyApiErrorMock).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Change profile' }));
    expect(screen.getByPlaceholderText('https://soundcloud.com/your-name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://soundcloud.com/your-name')).toHaveValue(
      'https://soundcloud.com/missing-profile',
    );
  });

  it('keeps a cached profile visible and offers a retry after refresh failure', () => {
    useAppStore.setState({ profileUrl: 'https://soundcloud.com/saved-artist' });
    userQueryMock.mockReturnValue({
      data: { avatar_url: 'https://img.example.test/avatar.png', full_name: 'Artist Name' },
      error: { error: 'Refresh failed' },
      isFetching: false,
      isLoading: false,
      refetch: refetchMock,
    });

    render(<UserInput />);

    expect(screen.getByText('Artist Name')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not refresh this profile. Your saved profile is still available.',
    );
    expect(screen.getByRole('button', { name: 'Change SoundCloud profile' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().profileUrl).toBe('https://soundcloud.com/saved-artist');
  });

  it('keeps the profile form available while the lookup is loading', () => {
    useAppStore.setState({ profileUrl: 'https://soundcloud.com/slow-profile' });
    userQueryMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: refetchMock,
    });

    render(<UserInput />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading SoundCloud profile...');
    fireEvent.click(screen.getByRole('button', { name: 'Change profile' }));

    expect(screen.getByRole('textbox', { name: 'SoundCloud profile link' })).toHaveValue(
      'https://soundcloud.com/slow-profile',
    );
  });
});
