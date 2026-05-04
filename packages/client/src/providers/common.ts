import type { ProviderAdapter } from './types';

export const createDefaultTrackName = (track: Parameters<ProviderAdapter['toDownloadName']>[0]) =>
  `${track.user} - ${track.title}`;
