import type { ProviderAdapter, ProviderKey, SourceInfo } from './types';

import { soundcloudProvider } from './soundcloud';
import { youtubeProvider } from './youtube';

export const providers = [soundcloudProvider, youtubeProvider] as const satisfies readonly ProviderAdapter[];

export const providerRegistry = new Map<ProviderKey, ProviderAdapter>(
  providers.map((provider) => [provider.key, provider]),
);

export const getProvider = (key: ProviderKey): ProviderAdapter | undefined => providerRegistry.get(key);

export const getProviderByUrl = (url: string): ProviderAdapter | undefined => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return undefined;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const normalizedUrl = new URL(parsedUrl.toString());
  normalizedUrl.hostname = hostname;

  return providers.find((provider) => provider.matchesUrl(normalizedUrl));
};

export const classifySource = (url: string): ProviderKey | null => getProviderByUrl(url)?.key ?? null;

export const resolveSourceInfo = (url: string): SourceInfo | null => {
  const provider = getProviderByUrl(url);

  return provider
    ? {
        provider: provider.key,
        url,
      }
    : null;
};
