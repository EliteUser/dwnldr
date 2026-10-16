import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGetFavoritesQuery, useGetUserQuery } from './api';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

describe('SoundCloud profile queries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes profile links in the users request and query key', async () => {
    const queryClient = createQueryClient();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        avatar_url: null,
        full_name: 'Artist Name',
        id: 123,
        permalink_url: 'https://soundcloud.com/artist-name',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useGetUserQuery('http://www.soundcloud.com/artist-name/likes?ref=profile'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/soundcloud/users?profileUrl=https%3A%2F%2Fsoundcloud.com%2Fartist-name',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual([
      'providers',
      'soundcloud',
      'user',
      'https://soundcloud.com/artist-name',
    ]);
  });

  it('normalizes profile links in the favorites request and query key', async () => {
    const queryClient = createQueryClient();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'track-1', title: 'Track' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useGetFavoritesQuery('https://m.soundcloud.com/artist/likes/'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/soundcloud/favorites?profileUrl=https%3A%2F%2Fsoundcloud.com%2Fartist',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual([
      'providers',
      'soundcloud',
      'favorites',
      'https://soundcloud.com/artist',
    ]);
  });

  it('aborts an obsolete favorites request when the profile changes and when the hook unmounts', async () => {
    const queryClient = createQueryClient();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Request aborted', 'AbortError')), {
            once: true,
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { rerender, unmount } = renderHook(({ profileUrl }) => useGetFavoritesQuery(profileUrl), {
      initialProps: { profileUrl: 'https://soundcloud.com/first-artist' },
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error('Expected the first query request');
    }
    const firstSignal = firstCall[1]?.signal;
    if (!firstSignal) {
      throw new Error('Expected the first query to receive an abort signal');
    }

    rerender({ profileUrl: 'https://soundcloud.com/second-artist' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(firstSignal.aborted).toBe(true));

    const secondCall = fetchMock.mock.calls[1];
    if (!secondCall) {
      throw new Error('Expected the second query request');
    }
    const secondSignal = secondCall[1]?.signal;
    if (!secondSignal) {
      throw new Error('Expected the second query to receive an abort signal');
    }
    unmount();
    await waitFor(() => expect(secondSignal.aborted).toBe(true));
  });
});
