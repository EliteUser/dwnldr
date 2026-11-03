import type { ApiError, Profile, ProviderInfo, Track } from '@dwnldr/shared';
import { QueryClient, useQuery } from '@tanstack/react-query';

export class ApiRequestError extends Error {
  constructor(
    readonly response: ApiError,
    readonly status: number,
  ) {
    super(response.error);
    this.name = 'ApiRequestError';
  }
}

export const readApiError = async (response: Response) => {
  const body = (await response.json().catch(() => undefined)) as Partial<ApiError> | undefined;

  return new ApiRequestError(
    { code: body?.code ?? 'INTERNAL_ERROR', error: body?.error ?? (response.statusText || 'Request failed') },
    response.status,
  );
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

const fetchJson = async <T>(path: string, params: Record<string, string>, signal: AbortSignal) => {
  const response = await fetch(`/api/${path}?${new URLSearchParams(params)}`, { signal });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return (await response.json()) as T;
};

export const isHttpUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const useProviders = () =>
  useQuery({
    queryKey: ['providers'],
    queryFn: ({ signal }) => fetchJson<ProviderInfo[]>('providers', {}, signal),
    staleTime: Infinity,
  });

export const useTrack = (url: string) =>
  useQuery({
    enabled: isHttpUrl(url),
    queryKey: ['track', url],
    queryFn: ({ signal }) => fetchJson<Track>('tracks', { url }, signal),
  });

export const useProfile = (profileUrl: string | null) =>
  useQuery({
    enabled: !!profileUrl,
    queryKey: ['profile', profileUrl],
    queryFn: ({ signal }) => fetchJson<Profile>('profile', { url: profileUrl! }, signal),
  });

export const useLikes = (profileUrl: string | null) =>
  useQuery({
    enabled: !!profileUrl,
    queryKey: ['likes', profileUrl],
    queryFn: ({ signal }) => fetchJson<Track[]>('likes', { url: profileUrl! }, signal),
  });
