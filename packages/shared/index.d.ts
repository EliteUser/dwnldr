// API contract shared by the server and the client. Types only: nothing here exists at runtime.

export type ProviderInfo = {
  key: string;
  label: string;
};

export type Track = {
  id: string;
  url: string;
  title: string;
  artist: string;
  durationMs: number;
  artworkUrl: string | null;
};

export type Profile = {
  id: string;
  name: string;
  url: string;
  avatarUrl: string | null;
};

export type TrackTags = {
  album: string;
  artwork: { dataUrl: string; mimeType: string } | null;
  lyrics: string;
  name: string;
};

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_SOURCE'
  | 'PLAYLIST_NOT_SUPPORTED'
  | 'NOT_FOUND'
  | 'UPSTREAM_UNAUTHORIZED'
  | 'UPSTREAM_FAILURE'
  | 'RATE_LIMITED'
  | 'SERVER_BUSY'
  | 'INTERNAL_ERROR';

export type ApiError = {
  code: ApiErrorCode;
  details?: unknown;
  error: string;
};
