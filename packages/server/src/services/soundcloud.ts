import type { Profile, Track } from '@dwnldr/shared';
import { z } from 'zod';

import { getErrorStatus, HttpError, isAbortError } from '../errors.js';
import { getLogger } from '../lib/logger.js';
import { fetchHttpJson, fetchHttpText } from './http/http.service.js';

const API_ORIGIN = 'https://api-v2.soundcloud.com';
const API_HEADERS = {
  Origin: 'https://soundcloud.com',
  Referer: 'https://soundcloud.com/',
  'User-Agent': 'Mozilla/5.0',
};
const REQUEST_TIMEOUT_MS = 30_000;
const CLIENT_ID_DISCOVERY_TIMEOUT_MS = 15_000;
const LIKES_PAGE_SIZE = 200;
const MAX_LIKES = 2000;
const PROFILE_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com']);

const idSchema = z.union([z.number(), z.string()]).transform(String);

const userSchema = z.object({
  avatar_url: z.string().nullish(),
  full_name: z.string().nullish(),
  id: idSchema,
  kind: z.literal('user'),
  permalink_url: z.string().optional(),
  username: z.string(),
});

const trackSchema = z.object({
  artwork_url: z.string().nullish(),
  duration: z.number(),
  id: idSchema,
  kind: z.literal('track'),
  permalink_url: z.string(),
  title: z.string(),
  user: z.object({
    avatar_url: z.string().nullish(),
    username: z.string(),
  }),
});

const likesPageSchema = z.object({
  collection: z.array(z.object({ track: z.unknown() }).partial()),
  next_href: z.string().nullish(),
});

const toTrack = (track: z.infer<typeof trackSchema>): Track => ({
  id: track.id,
  url: track.permalink_url,
  title: track.title,
  artist: track.user.username,
  durationMs: track.duration,
  artworkUrl: track.artwork_url ?? track.user.avatar_url ?? null,
});

// SoundCloud has no public API keys; the web app embeds a client_id in its scripts.
const discoverClientId = async () => {
  const signal = AbortSignal.timeout(CLIENT_ID_DISCOVERY_TIMEOUT_MS);
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const html = await fetchHttpText('https://soundcloud.com/', { headers, signal });
  const scriptUrls = [...html.matchAll(/<script[^>]+src="(https:\/\/a-v2\.sndcdn\.com\/[^"]+\.js)"/g)].map(
    (match) => match[1],
  );

  for (const scriptUrl of scriptUrls.reverse()) {
    const script = await fetchHttpText(scriptUrl, { headers, signal });
    const clientId = script.match(/[,{]\s*client_id\s*:\s*"([\w-]{16,128})"/)?.[1];

    if (clientId) {
      return clientId;
    }
  }

  throw new Error('SoundCloud client ID discovery failed.');
};

let clientId: string | undefined;
let clientIdDiscovery: Promise<string> | undefined;

const getClientId = async () => {
  clientIdDiscovery ??= discoverClientId().finally(() => {
    clientIdDiscovery = undefined;
  });
  clientId ??= await clientIdDiscovery;

  return clientId;
};

const getJson = async (url: URL, signal: AbortSignal, retryWithNewClientId = true): Promise<unknown> => {
  const requestUrl = new URL(url);
  const currentClientId = await getClientId();

  requestUrl.searchParams.set('client_id', currentClientId);

  try {
    return await fetchHttpJson(requestUrl, { headers: API_HEADERS, signal });
  } catch (error) {
    const status = getErrorStatus(error);

    if (retryWithNewClientId && (status === 401 || status === 403)) {
      if (clientId === currentClientId) {
        clientId = undefined;
      }

      return getJson(url, signal, false);
    }

    throw error;
  }
};

const assertApiUrl = (input: string) => {
  const url = new URL(input);

  if (url.origin !== API_ORIGIN) {
    throw new Error('SoundCloud returned an untrusted API URL.');
  }

  return url;
};

const withSoundCloudErrors = async <T>(
  signal: AbortSignal,
  notFoundMessage: string,
  run: (signal: AbortSignal) => Promise<T>,
) => {
  try {
    return await run(AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]));
  } catch (error) {
    if (error instanceof HttpError || (signal.aborted && isAbortError(error))) {
      throw error;
    }

    const status = getErrorStatus(error);

    if (status === 404) {
      throw new HttpError(404, notFoundMessage, { code: 'NOT_FOUND' });
    }

    getLogger().warn({ evt: 'soundcloud.request.failed', status, err: error }, 'SoundCloud request failed');

    throw new HttpError(502, 'SoundCloud did not respond. Try again later.', {
      code: status === 401 || status === 403 ? 'UPSTREAM_UNAUTHORIZED' : 'UPSTREAM_FAILURE',
    });
  }
};

const resolve = async <T extends z.ZodType>(url: string, schema: T, signal: AbortSignal, wrongKindMessage: string) => {
  const resolveUrl = new URL('/resolve', API_ORIGIN);
  resolveUrl.searchParams.set('url', url);

  const parsed = schema.safeParse(await getJson(resolveUrl, signal));

  if (!parsed.success) {
    throw new HttpError(400, wrongKindMessage, { code: 'INVALID_INPUT' });
  }

  return parsed.data as z.infer<T>;
};

/** Accepts `soundcloud.com/<user>` and `soundcloud.com/<user>/likes`; returns `https://soundcloud.com/<user>`. */
export const normalizeProfileUrl = (input: string) => {
  const invalid = () => new HttpError(400, 'Enter a SoundCloud profile URL.', { code: 'INVALID_INPUT' });
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw invalid();
  }

  const segments = url.pathname.split('/').filter(Boolean);

  if (
    !PROFILE_HOSTS.has(url.hostname.toLowerCase()) ||
    segments.length < 1 ||
    segments.length > 2 ||
    (segments.length === 2 && segments[1].toLowerCase() !== 'likes')
  ) {
    throw invalid();
  }

  return `https://soundcloud.com/${segments[0]}`;
};

const resolveProfile = (profileUrl: string, signal: AbortSignal) =>
  resolve(normalizeProfileUrl(profileUrl), userSchema, signal, 'Enter a SoundCloud profile URL.');

export const getTrack = (url: string, signal: AbortSignal) =>
  withSoundCloudErrors(signal, 'Track not found.', async (requestSignal) =>
    toTrack(await resolve(url, trackSchema, requestSignal, 'Enter a SoundCloud track URL.')),
  );

export const getProfile = (profileUrl: string, signal: AbortSignal) =>
  withSoundCloudErrors(signal, 'SoundCloud profile not found.', async (requestSignal): Promise<Profile> => {
    const user = await resolveProfile(profileUrl, requestSignal);

    return {
      id: user.id,
      name: user.full_name?.trim() || user.username,
      url: user.permalink_url ?? normalizeProfileUrl(profileUrl),
      avatarUrl: user.avatar_url ?? null,
    };
  });

export const getLikes = (profileUrl: string, signal: AbortSignal) =>
  withSoundCloudErrors(signal, 'SoundCloud profile not found.', async (requestSignal) => {
    const user = await resolveProfile(profileUrl, requestSignal);
    const tracks = new Map<string, Track>();
    let pageUrl: URL | undefined = new URL(`/users/${encodeURIComponent(user.id)}/likes`, API_ORIGIN);

    pageUrl.searchParams.set('linked_partitioning', '1');
    pageUrl.searchParams.set('limit', String(LIKES_PAGE_SIZE));

    while (pageUrl && tracks.size < MAX_LIKES) {
      const page = likesPageSchema.parse(await getJson(pageUrl, requestSignal));

      for (const item of page.collection) {
        // Likes also include playlists and deleted tracks; keep only tracks that parse.
        const track = trackSchema.safeParse(item.track);

        if (track.success && tracks.size < MAX_LIKES) {
          tracks.set(track.data.id, toTrack(track.data));
        }
      }

      const nextUrl: URL | undefined = page.next_href ? assertApiUrl(page.next_href) : undefined;
      pageUrl = nextUrl?.href === pageUrl.href ? undefined : nextUrl;
    }

    return [...tracks.values()];
  });
