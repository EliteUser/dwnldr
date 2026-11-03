import type { Profile, Track } from '@dwnldr/shared';

export type DownloadedAudio = {
  audioPath: string;
  /** Artwork the provider saved next to the audio, if any. */
  artworkPath?: string;
};

/**
 * A music source. Only key, label and hosts are required: track metadata and downloads fall back to
 * yt-dlp, which supports most sites. A provider overrides a method when it has a faster or better
 * source, and offers profile/likes only when it implements them.
 */
export type Provider = {
  key: string;
  label: string;
  /** Hostnames this provider handles; subdomains match too. */
  hosts: string[];
  getTrack?: (url: string, signal: AbortSignal) => Promise<Track>;
  download?: (url: string, folder: string, signal: AbortSignal) => Promise<DownloadedAudio>;
  getProfile?: (url: string, signal: AbortSignal) => Promise<Profile>;
  getLikes?: (url: string, signal: AbortSignal) => Promise<Track[]>;
};
