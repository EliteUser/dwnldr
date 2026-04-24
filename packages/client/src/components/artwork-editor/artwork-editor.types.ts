import type { ArtworkDownloadPayload } from '../../types';

export type ArtworkEditorProps = {
  disabled?: boolean;
  onArtworkChange: (payload?: ArtworkDownloadPayload) => void;
  providerArtworkUrl?: string | null;
  resetKey: string;
};
