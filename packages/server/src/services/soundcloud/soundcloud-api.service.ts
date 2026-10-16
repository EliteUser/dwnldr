import { getErrorStatus } from '../../errors/error-utils.js';
import { fetchHttpJson } from '../http/http.service.js';
import { SoundCloudClientIdManager } from './soundcloud-client-id.service.js';

export const SOUNDCLOUD_API_ORIGIN = 'https://api-v2.soundcloud.com';
const API_HEADERS = {
  Origin: 'https://soundcloud.com',
  Referer: 'https://soundcloud.com/',
  'User-Agent': 'Mozilla/5.0',
};

type SoundCloudApiDependencies = {
  clientIds: SoundCloudClientIdManager;
  fetchJson: typeof fetchHttpJson;
};

const defaultDependencies: SoundCloudApiDependencies = {
  clientIds: new SoundCloudClientIdManager(),
  fetchJson: fetchHttpJson,
};

export const assertSoundCloudApiUrl = (input: string | URL) => {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error('SoundCloud returned an invalid API pagination URL.');
  }

  if (url.protocol !== 'https:' || url.origin !== SOUNDCLOUD_API_ORIGIN || url.username || url.password) {
    throw new Error('SoundCloud returned an untrusted API pagination URL.');
  }

  return url;
};

export class SoundCloudApiClient {
  constructor(private readonly dependencies: SoundCloudApiDependencies = defaultDependencies) {}

  async getJson<T>(input: string | URL, signal?: AbortSignal): Promise<T> {
    const baseUrl = assertSoundCloudApiUrl(input);
    const fetchWithClientId = (clientId: string) => {
      const url = new URL(baseUrl);
      url.searchParams.set('client_id', clientId);

      return this.dependencies.fetchJson<T>(url, {
        headers: API_HEADERS,
        signal,
      });
    };

    signal?.throwIfAborted();
    const clientId = await this.dependencies.clientIds.get(signal);

    try {
      return await fetchWithClientId(clientId);
    } catch (error) {
      const status = getErrorStatus(error);

      if (status !== 401 && status !== 403) {
        throw error;
      }

      this.dependencies.clientIds.invalidate(clientId);
      signal?.throwIfAborted();
      const refreshedClientId = await this.dependencies.clientIds.get(signal);
      return fetchWithClientId(refreshedClientId);
    }
  }
}

export const soundCloudApi = new SoundCloudApiClient();
