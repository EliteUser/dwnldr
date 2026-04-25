import type { ArtworkDownloadPayload } from '../../types';

export type ArtworkProps = {
  disabled?: boolean;
  onArtworkChange: (payload?: ArtworkDownloadPayload) => void;
  providerArtworkUrl?: string | null;
  resetKey: string;
};

export type ArtworkSourceMode = 'file' | 'url';
