export type TrackProps = {
  name?: string;
  album?: string;
  lyrics?: string;
};

export type TrackOptions = TrackProps & {
  url: string;
};

export type TrackProcessOptions = TrackProps & {
  coverPath?: string;
  filePath: string;
  name: string;
};

export type TrackMetadata = {
  id: number | string;
  artwork_url: string | null;
  permalink_url: string;
  duration: number;
  title: string;
  user: string;
};

export type ProviderKey = 'soundcloud' | 'youtube';

export type SourceInfo = {
  provider: ProviderKey;
  url: string;
};

export type ProviderCapabilities = {
  collections: boolean;
  downloads: boolean;
  metadata: boolean;
  users: boolean;
};
