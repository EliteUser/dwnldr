import ipaddr from 'ipaddr.js';
import type { LookupAddress } from 'node:dns';
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import { Readable } from 'node:stream';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export class UnsafeRemoteUrlError extends Error {
  constructor(message = 'Remote URL is not allowed.') {
    super(message);
    this.name = 'UnsafeRemoteUrlError';
  }
}

export const isPublicAddress = (address: string) => {
  if (!ipaddr.isValid(address)) {
    return false;
  }

  const parsedAddress = ipaddr.process(address);

  return parsedAddress.range() === 'unicast';
};

export const validatePublicHttpUrlShape = (url: URL) => {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeRemoteUrlError('Remote URL must use HTTP or HTTPS.');
  }

  if (url.username || url.password) {
    throw new UnsafeRemoteUrlError('Remote URL credentials are not allowed.');
  }

  const port = url.port || (url.protocol === 'https:' ? '443' : '80');

  if (!['80', '443'].includes(port)) {
    throw new UnsafeRemoteUrlError('Remote URL must use port 80 or 443.');
  }
};

type LookupAll = (hostname: string) => Promise<LookupAddress[]>;

const defaultLookupAll: LookupAll = async (hostname) =>
  await dns.lookup(hostname, {
    all: true,
    verbatim: true,
  });

const resolvePublicAddresses = async (hostname: string, lookupAll: LookupAll): Promise<LookupAddress[]> => {
  let addresses: LookupAddress[];

  try {
    addresses = await lookupAll(hostname);
  } catch {
    throw new UnsafeRemoteUrlError('Remote hostname could not be resolved.');
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new UnsafeRemoteUrlError();
  }

  return addresses;
};

const toHeaders = (headers: http.IncomingHttpHeaders) => {
  const result = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(name, item));
    } else if (value !== undefined) {
      result.set(name, value);
    }
  }

  return result;
};

export type PublicHttpOptions = {
  headers?: Record<string, string>;
  maxRedirects?: number;
  signal?: AbortSignal;
};

export const createPinnedLookup =
  (address: LookupAddress): LookupFunction =>
  (_hostname, lookupOptions, callback) => {
    if (lookupOptions.all) {
      callback(null, [address]);
      return;
    }

    callback(null, address.address, address.family);
  };

const requestPinnedUrl = async (url: URL, address: LookupAddress, options: PublicHttpOptions) =>
  await new Promise<Response>((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(
      url,
      {
        headers: options.headers,
        lookup: createPinnedLookup(address),
        method: 'GET',
        signal: options.signal,
      },
      (response) => {
        try {
          const status = response.statusCode ?? 500;
          const body = [204, 304].includes(status) ? null : (Readable.toWeb(response) as ReadableStream<Uint8Array>);

          resolve(
            new Response(body, {
              headers: toHeaders(response.headers),
              status,
              statusText: response.statusMessage,
            }),
          );
        } catch (error) {
          response.destroy();
          reject(error);
        }
      },
    );

    request.once('error', reject);
    request.end();
  });

type PublicHttpDependencies = {
  lookupAll: LookupAll;
  requestPinned: typeof requestPinnedUrl;
};

const requestFirstReachableAddress = async (
  url: URL,
  addresses: LookupAddress[],
  options: PublicHttpOptions,
  requestPinned: typeof requestPinnedUrl,
) => {
  let lastError: unknown;

  for (const address of addresses) {
    try {
      return await requestPinned(url, address, options);
    } catch (error) {
      if (options.signal?.aborted) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError ?? new UnsafeRemoteUrlError('Remote host could not be reached.');
};

export const createPublicHttpFetcher =
  (dependencies: PublicHttpDependencies) =>
  async (input: string | URL, options: PublicHttpOptions = {}): Promise<Response> => {
    const maxRedirects = options.maxRedirects ?? 3;
    let currentUrl = input instanceof URL ? new URL(input) : new URL(input);

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      validatePublicHttpUrlShape(currentUrl);
      const addresses = await resolvePublicAddresses(currentUrl.hostname, dependencies.lookupAll);
      const response = await requestFirstReachableAddress(currentUrl, addresses, options, dependencies.requestPinned);

      if (!REDIRECT_STATUS_CODES.has(response.status)) {
        return response;
      }

      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => undefined);

      if (!location || redirectCount === maxRedirects) {
        throw new UnsafeRemoteUrlError('Remote URL redirected too many times.');
      }

      currentUrl = new URL(location, currentUrl);
    }

    throw new UnsafeRemoteUrlError('Remote URL redirected too many times.');
  };

export const fetchPublicHttpUrl = createPublicHttpFetcher({
  lookupAll: defaultLookupAll,
  requestPinned: requestPinnedUrl,
});
