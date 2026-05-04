import { HttpError } from '../errors/http-error.js';
import type { ProviderKey, SourceInfo } from '../types.js';
import { soundcloudProvider } from './soundcloud/index.js';
import type { MusicProvider, MusicProviderFeature } from './types.js';
import { youtubeProvider } from './youtube/index.js';

export const providers = [soundcloudProvider, youtubeProvider] as const satisfies readonly MusicProvider[];

export const providerRegistry = new Map<ProviderKey, MusicProvider>(
  providers.map((provider) => [provider.key, provider]),
);

export const getProvider = (key: ProviderKey): MusicProvider => {
  const provider = providerRegistry.get(key);

  if (!provider) {
    throw new HttpError(400, `Unsupported provider: ${key}`, {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  return provider;
};

export const getProviderByUrl = (url: string): MusicProvider | null => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const normalizedUrl = new URL(parsedUrl.toString());
  normalizedUrl.hostname = hostname;

  return providers.find((provider) => provider.matchesUrl(normalizedUrl)) ?? null;
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

export const requireProviderByUrl = (url: string): MusicProvider => {
  const provider = getProviderByUrl(url);

  if (!provider) {
    throw new HttpError(400, 'Unsupported URL source. Use a SoundCloud or YouTube link.', {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  return provider;
};

export const requireProviderFeature = <T extends MusicProviderFeature>(
  provider: MusicProvider,
  feature: T,
): NonNullable<MusicProvider[T]> => {
  const implementation = provider[feature];

  if (!implementation) {
    throw new HttpError(400, `${provider.label} does not support this operation.`, {
      code: 'UNSUPPORTED_SOURCE',
    });
  }

  return implementation as NonNullable<MusicProvider[T]>;
};
