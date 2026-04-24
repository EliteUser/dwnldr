import { QueryClient, useQuery } from '@tanstack/react-query';

import { getProviderByUrl } from '../providers';
import { parseApiErrorResponse, type ApiErrorResponse } from '../utils';

type UserResult = {
  avatar_url: string;
  full_name: string;
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

export class ApiRequestError extends Error {
  response: ApiErrorResponse;
  status: number;

  constructor(response: ApiErrorResponse, status: number) {
    super(response.error || 'Request failed');
    this.name = 'ApiRequestError';
    this.response = response;
    this.status = status;
  }
}

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

const fetchJson = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const response = await fetch(buildApiUrl(path, params), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiRequestError(await parseApiErrorResponse(response), response.status);
  }

  return (await response.json()) as T;
};

export const useGetUserQuery = (userId: string, options: QueryOptions = {}) =>
  useQuery({
    enabled: !options.skip && !!userId,
    queryFn: () => fetchJson<UserResult>('soundcloud/users', { userId }),
    queryKey: ['providers', 'soundcloud', 'user', userId],
  });

export const useGetProviderTrackQuery = (url: string, options: QueryOptions = {}) => {
  const provider = getProviderByUrl(url);

  const query = useQuery({
    enabled: !options.skip && !!url && !!provider,
    queryFn: () => fetchJson<TracksResult>('tracks', { url }),
    queryKey: provider?.getTrackQueryKey(url) ?? ['providers', 'unknown', 'track', url],
  });

  return {
    ...query,
    currentData: query.data,
    provider,
  };
};

export const useGetFavoritesQuery = (userId: string, options: QueryOptions = {}) =>
  useQuery({
    enabled: !options.skip && !!userId,
    queryFn: () => fetchJson<TracksResult[]>('soundcloud/favorites', { userId }),
    queryKey: ['providers', 'soundcloud', 'favorites', userId],
  });
