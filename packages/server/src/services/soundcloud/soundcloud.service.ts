import { z } from 'zod';

import { isAbortError } from '../../errors/error-utils.js';
import { HttpError } from '../../errors/http-error.js';
import { logTimedOperation } from '../../lib/logger.js';
import type { TrackMetadata } from '../../types.js';
import { getSafeUrlLogFields } from '../../utils/url-log.utils.js';
import { createDeadlineSignal } from '../http/http.service.js';
import { getSoundCloudTrackData } from '../metadata/track-metadata.service.js';
import { SOUNDCLOUD_API_ORIGIN, assertSoundCloudApiUrl, soundCloudApi } from './soundcloud-api.service.js';
import { toSoundCloudHttpError } from './soundcloud.errors.js';
import { normalizeSoundCloudProfileUrl, normalizeSoundCloudTrackUrl } from './soundcloud.profile.js';
import { soundCloudLikesPageSchema, soundCloudTrackSchema, soundCloudUserSchema } from './soundcloud.schemas.js';
import type { SoundCloudTrack, SoundCloudUser } from './soundcloud.schemas.js';

const SOUNDCLOUD_METADATA_TIMEOUT_MS = 30_000;
const LIKES_PAGE_SIZE = 200;

const withSoundCloudDeadline = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    notFoundMessage?: string;
    signal?: AbortSignal;
  },
) => {
  const deadline = createDeadlineSignal(SOUNDCLOUD_METADATA_TIMEOUT_MS, options.signal);

  try {
    return await operation(deadline.signal);
  } catch (error) {
    if (deadline.didTimeout) {
      throw new HttpError(504, 'SoundCloud request timed out. Try again later.', {
        code: 'UPSTREAM_FAILURE',
        details: {
          timeoutMs: SOUNDCLOUD_METADATA_TIMEOUT_MS,
        },
      });
    }

    if (options.signal?.aborted || isAbortError(error)) {
      throw error;
    }

    throw toSoundCloudHttpError(error, options.notFoundMessage);
  } finally {
    deadline.dispose();
  }
};

const resolveUser = async (canonicalProfileUrl: string, signal: AbortSignal): Promise<SoundCloudUser> => {
  const resolveUrl = new URL('/resolve', SOUNDCLOUD_API_ORIGIN);
  resolveUrl.searchParams.set('url', canonicalProfileUrl);
  const response = await soundCloudApi.getJson<unknown>(resolveUrl, signal);

  if (typeof response === 'object' && response !== null && 'kind' in response && response.kind !== 'user') {
    throw new HttpError(400, 'Enter a SoundCloud profile URL.', {
      code: 'INVALID_INPUT',
    });
  }

  const parsedUser = soundCloudUserSchema.parse(response);

  if (parsedUser.kind !== 'user') {
    throw new HttpError(400, 'Enter a SoundCloud profile URL.', {
      code: 'INVALID_INPUT',
    });
  }

  return parsedUser;
};

const resolveTrack = async (canonicalTrackUrl: string, signal: AbortSignal): Promise<SoundCloudTrack> => {
  const resolveUrl = new URL('/resolve', SOUNDCLOUD_API_ORIGIN);
  resolveUrl.searchParams.set('url', canonicalTrackUrl);
  const response = await soundCloudApi.getJson<unknown>(resolveUrl, signal);

  if (typeof response === 'object' && response !== null && 'kind' in response && response.kind !== 'track') {
    throw new HttpError(400, 'Enter a SoundCloud track URL.', {
      code: 'INVALID_INPUT',
    });
  }

  const parsedTrack = soundCloudTrackSchema.parse(response);

  if (parsedTrack.kind !== 'track') {
    throw new HttpError(400, 'Enter a SoundCloud track URL.', {
      code: 'INVALID_INPUT',
    });
  }

  return parsedTrack;
};

const toProviderUser = (user: SoundCloudUser, canonicalProfileUrl: string) => ({
  id: user.id,
  full_name: user.full_name?.trim() || user.username,
  avatar_url: user.avatar_url ?? null,
  permalink_url: user.permalink_url ?? canonicalProfileUrl,
});

const getLikeTrack = (entry: unknown): SoundCloudTrack | null => {
  if (entry === null) {
    return null;
  }

  if (typeof entry !== 'object' || Array.isArray(entry)) {
    return soundCloudTrackSchema.parse(entry);
  }

  const candidate = entry as {
    kind?: unknown;
    track?: unknown;
  };

  if (candidate.kind === 'playlist' || candidate.kind === 'track-deleted' || candidate.kind === 'playlist-deleted') {
    return null;
  }

  if (candidate.kind === 'like') {
    if (candidate.track === null || candidate.track === undefined) {
      return null;
    }

    if (typeof candidate.track === 'object' && candidate.track !== null && 'kind' in candidate.track) {
      const trackKind = (candidate.track as { kind?: unknown }).kind;

      if (trackKind === 'playlist' || trackKind === 'track-deleted' || trackKind === 'playlist-deleted') {
        return null;
      }
    }

    return soundCloudTrackSchema.parse(candidate.track);
  }

  if (candidate.kind === 'track') {
    return soundCloudTrackSchema.parse(entry);
  }

  if (candidate.kind === 'deleted' || candidate.kind === 'null') {
    return null;
  }

  return z.never().parse(entry);
};

const getFavorites = async (userId: number | string, signal: AbortSignal, limit?: number) => {
  const tracks: TrackMetadata[] = [];
  const seenTrackIds = new Set<string>();
  const seenPageUrls = new Set<string>();
  const firstPageUrl = new URL(`/users/${encodeURIComponent(String(userId))}/likes`, SOUNDCLOUD_API_ORIGIN);
  firstPageUrl.searchParams.set('linked_partitioning', '1');
  firstPageUrl.searchParams.set('limit', String(Math.min(LIKES_PAGE_SIZE, limit ?? LIKES_PAGE_SIZE)));

  let pageUrl: URL | undefined = firstPageUrl;

  while (pageUrl) {
    signal.throwIfAborted();
    const normalizedPageUrl = assertSoundCloudApiUrl(pageUrl).toString();

    if (seenPageUrls.has(normalizedPageUrl)) {
      throw new Error('SoundCloud returned a repeated likes pagination URL.');
    }

    seenPageUrls.add(normalizedPageUrl);
    const response = await soundCloudApi.getJson<unknown>(pageUrl, signal);
    const page = soundCloudLikesPageSchema.parse(response);

    for (const item of page.collection) {
      const track = getLikeTrack(item);

      if (!track) {
        continue;
      }

      const id = String(track.id);

      if (seenTrackIds.has(id)) {
        continue;
      }

      seenTrackIds.add(id);
      tracks.push(getSoundCloudTrackData(track));

      if (limit !== undefined && tracks.length >= limit) {
        return tracks;
      }
    }

    pageUrl = page.next_href ? assertSoundCloudApiUrl(page.next_href) : undefined;

    if (pageUrl && seenPageUrls.has(pageUrl.toString())) {
      throw new Error('SoundCloud returned a repeated likes pagination URL.');
    }

    if (pageUrl && limit !== undefined) {
      pageUrl.searchParams.set('limit', String(Math.min(LIKES_PAGE_SIZE, limit - tracks.length)));
    }
  }

  return tracks;
};

export const getSoundCloudTrackDetails = (url: string, signal?: AbortSignal) =>
  withSoundCloudDeadline(
    async (operationSignal) => {
      const canonicalTrackUrl = normalizeSoundCloudTrackUrl(url);

      return logTimedOperation(
        {
          startEvt: 'sc.track.fetch.started',
          successEvt: 'sc.track.fetch.completed',
          failureEvt: 'sc.track.fetch.failed',
          startMessage: 'Fetching SoundCloud track metadata',
          successMessage: 'Fetched SoundCloud track metadata',
          failureMessage: 'Failed to fetch SoundCloud track metadata',
          bindings: {
            provider: 'soundcloud',
            ...getSafeUrlLogFields(canonicalTrackUrl),
          },
        },
        () => resolveTrack(canonicalTrackUrl, operationSignal),
      );
    },
    {
      notFoundMessage: 'Track not found.',
      signal,
    },
  );

export const getSoundCloudTrackByUrl = async (url: string, signal?: AbortSignal) =>
  getSoundCloudTrackData(await getSoundCloudTrackDetails(url, signal));

export const getUserByProfileUrl = (profileUrl: string, signal?: AbortSignal) =>
  withSoundCloudDeadline(
    async (operationSignal) => {
      const canonicalProfileUrl = normalizeSoundCloudProfileUrl(profileUrl);

      return logTimedOperation(
        {
          startEvt: 'sc.user.fetch.started',
          successEvt: 'sc.user.fetch.completed',
          failureEvt: 'sc.user.fetch.failed',
          startMessage: 'Fetching SoundCloud profile',
          successMessage: 'Fetched SoundCloud profile',
          failureMessage: 'Failed to fetch SoundCloud profile',
          bindings: {
            provider: 'soundcloud',
            ...getSafeUrlLogFields(canonicalProfileUrl),
          },
        },
        async () => toProviderUser(await resolveUser(canonicalProfileUrl, operationSignal), canonicalProfileUrl),
      );
    },
    {
      notFoundMessage: 'SoundCloud profile not found.',
      signal,
    },
  );

export const getFavoritesByProfileUrl = (profileUrl: string, limit?: number, signal?: AbortSignal) =>
  withSoundCloudDeadline(
    async (operationSignal) => {
      if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
        throw new HttpError(400, 'Limit must be a positive integer.', {
          code: 'INVALID_INPUT',
        });
      }

      const canonicalProfileUrl = normalizeSoundCloudProfileUrl(profileUrl);

      return logTimedOperation(
        {
          startEvt: 'sc.likes.fetch.started',
          successEvt: 'sc.likes.fetch.completed',
          failureEvt: 'sc.likes.fetch.failed',
          startMessage: 'Fetching SoundCloud likes',
          successMessage: 'Fetched SoundCloud likes',
          failureMessage: 'Failed to fetch SoundCloud likes',
          bindings: {
            provider: 'soundcloud',
            ...getSafeUrlLogFields(canonicalProfileUrl),
            limit,
          },
        },
        async () => {
          const user = await resolveUser(canonicalProfileUrl, operationSignal);
          return getFavorites(user.id, operationSignal, limit);
        },
      );
    },
    {
      notFoundMessage: 'SoundCloud profile not found.',
      signal,
    },
  );
