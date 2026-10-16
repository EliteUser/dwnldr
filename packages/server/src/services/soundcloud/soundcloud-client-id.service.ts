import { fetchHttpText, createDeadlineSignal } from '../http/http.service.js';

const SOUNDCLOUD_HOME_URL = 'https://soundcloud.com/';
const SOUNDCLOUD_MOBILE_URL = 'https://m.soundcloud.com/';
const CLIENT_ID_PATTERN = /[,{]\s*client_id\s*:\s*["']([\w-]{16,128})["']/i;
const MOBILE_CLIENT_ID_PATTERN = /["']clientId["']\s*:\s*["']([\w-]{16,128})["']/i;
const DISCOVERY_TIMEOUT_MS = 15_000;
const MAX_WEB_ASSETS = 40;

type DiscoveryDependencies = {
  fetchText: typeof fetchHttpText;
};

const withCallerAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) {
    return await promise;
  }

  signal.throwIfAborted();

  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const onAbort = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
};

const getWebAssetUrls = (html: string) => {
  const urls = new Set<string>();
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    try {
      const assetUrl = new URL(match[1], SOUNDCLOUD_HOME_URL);

      if (assetUrl.protocol === 'https:' && assetUrl.hostname.toLowerCase() === 'a-v2.sndcdn.com') {
        urls.add(assetUrl.toString());
      }
    } catch {
      // Ignore malformed asset references from the provider page.
    }
  }

  return [...urls].slice(0, MAX_WEB_ASSETS);
};

export const discoverSoundCloudClientId = async (
  dependencies: DiscoveryDependencies = { fetchText: fetchHttpText },
) => {
  const deadline = createDeadlineSignal(DISCOVERY_TIMEOUT_MS);

  try {
    let webDiscoveryError: unknown;

    try {
      const html = await dependencies.fetchText(SOUNDCLOUD_HOME_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: deadline.signal,
      });

      for (const assetUrl of getWebAssetUrls(html)) {
        const script = await dependencies.fetchText(assetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: deadline.signal,
        });
        const clientId = script.match(CLIENT_ID_PATTERN)?.[1];

        if (clientId) {
          return clientId;
        }
      }

      webDiscoveryError = new Error('SoundCloud web assets did not contain a client ID.');
    } catch (error) {
      webDiscoveryError = error;
    }

    const mobilePage = await dependencies.fetchText(SOUNDCLOUD_MOBILE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/99.0.4844.47 Mobile/15E148 Safari/604.1',
      },
      signal: deadline.signal,
    });
    const clientId = mobilePage.match(MOBILE_CLIENT_ID_PATTERN)?.[1];

    if (clientId) {
      return clientId;
    }

    throw new Error('SoundCloud client ID discovery failed.', { cause: webDiscoveryError });
  } finally {
    deadline.dispose();
  }
};

export class SoundCloudClientIdManager {
  private currentClientId: string | undefined;
  private discovery: Promise<string> | undefined;

  constructor(private readonly discover: () => Promise<string> = discoverSoundCloudClientId) {}

  async get(signal?: AbortSignal) {
    signal?.throwIfAborted();

    if (this.currentClientId) {
      signal?.throwIfAborted();
      return this.currentClientId;
    }

    this.discovery ??= this.discover()
      .then((clientId) => {
        this.currentClientId = clientId;
        return clientId;
      })
      .finally(() => {
        this.discovery = undefined;
      });

    return await withCallerAbort(this.discovery, signal);
  }

  invalidate(failedClientId: string) {
    if (this.currentClientId === failedClientId) {
      this.currentClientId = undefined;
    }
  }
}
