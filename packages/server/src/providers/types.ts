import type { ProviderCapabilities, ProviderKey, TrackMetadata, TrackOptions } from '../types.js';

export type ProviderDownloadOptions = {
  folder: string;
  signal?: AbortSignal;
  track: TrackOptions;
};

export type ProviderUser = {
  avatar_url?: string | null;
  full_name?: string;
  id?: number | string;
};

export type MusicProvider = {
  capabilities: ProviderCapabilities;
  downloadTrack?: (options: ProviderDownloadOptions) => Promise<string>;
  fetchFavorites?: (userId: string, limit?: number) => Promise<TrackMetadata[]>;
  getUser?: (userId: string) => Promise<ProviderUser>;
  key: ProviderKey;
  label: string;
  matchesUrl: (url: URL) => boolean;
  normalizeError?: (error: unknown) => unknown;
  resolveTrack?: (url: string) => Promise<TrackMetadata>;
};

export type MusicProviderFeature = {
  [K in keyof MusicProvider]-?: undefined extends MusicProvider[K] ? K : never;
}[keyof MusicProvider];
