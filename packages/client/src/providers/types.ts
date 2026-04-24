export type ProviderKey = 'soundcloud' | 'youtube';

export type SourceInfo = {
  provider: ProviderKey;
  url: string;
};

export type TrackInfo = {
  title: string;
  user: string;
};

export type ProviderCapabilities = {
  collections: boolean;
  downloads: boolean;
  metadata: boolean;
  users: boolean;
};

export type ProviderAdapter = {
  capabilities: ProviderCapabilities;
  getTrackQueryKey: (url: string) => readonly unknown[];
  key: ProviderKey;
  label: string;
  matchesUrl: (url: URL) => boolean;
  trackPath: string;
  toDownloadName: (track: TrackInfo) => string;
};
