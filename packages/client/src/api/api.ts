import { QueryClient, useQuery } from '@tanstack/react-query';

import { getProviderByUrl } from '../providers';
import { normalizeSoundCloudProfileUrl } from '../providers/soundcloud/profile-url.utils';
import { ApiRequestError, parseApiErrorResponse } from './api.errors';

type UserResult = {
  avatar_url: string | null;
  full_name: string;
  id: number | string;
  permalink_url: string;
};

export type TracksResult = {
  id: number | string;
  artwork?: {
    url: string | null;
  };
  artwork_url: string | null;
  permalink_url: string;
  duration: number;
  title: string;
  user: string;
};

type QueryOptions = {
  skip?: boolean;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 30_000,
    },
  },
});

const buildApiUrl = (path: string, params: Record<string, string>) => {
  const url = new URL(`/api/${path}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}`;
};

const fetchJson = async <T>(path: string, params: Record<string, string>, signal: AbortSignal): Promise<T> => {
  const response = await fetch(buildApiUrl(path, params), {
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseApiErrorResponse(response), response.status);
  }

  return (await response.json()) as T;
};

export const useGetUserQuery = (profileUrl: string, options: QueryOptions = {}) => {
  const normalizedProfileUrl = normalizeSoundCloudProfileUrl(profileUrl);

  return useQuery({
    enabled: !options.skip && !!normalizedProfileUrl,
    queryFn: ({ signal }) => fetchJson<UserResult>('soundcloud/users', { profileUrl: normalizedProfileUrl! }, signal),
    queryKey: ['providers', 'soundcloud', 'user', normalizedProfileUrl ?? ''],
  });
};

export const useGetProviderTrackQuery = (url: string, options: QueryOptions = {}) => {
  const provider = getProviderByUrl(url);

  const query = useQuery({
    enabled: !options.skip && !!url && !!provider,
    queryFn: ({ signal }) => fetchJson<TracksResult>('tracks', { url }, signal),
    queryKey: provider?.getTrackQueryKey(url) ?? ['providers', 'unknown', 'track', url],
  });

  return {
    ...query,
    currentData: query.data,
    provider,
  };
};

export const useGetFavoritesQuery = (profileUrl: string, options: QueryOptions = {}) => {
  const normalizedProfileUrl = normalizeSoundCloudProfileUrl(profileUrl);

  return useQuery({
    enabled: !options.skip && !!normalizedProfileUrl,
    queryFn: ({ signal }) =>
      fetchJson<TracksResult[]>('soundcloud/favorites', { profileUrl: normalizedProfileUrl! }, signal),
    queryKey: ['providers', 'soundcloud', 'favorites', normalizedProfileUrl ?? ''],
  });
};
