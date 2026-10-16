import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getJsonMock } = vi.hoisted(() => ({
  getJsonMock: vi.fn(),
}));

vi.mock('./soundcloud-api.service.js', () => ({
  SOUNDCLOUD_API_ORIGIN: 'https://api-v2.soundcloud.com',
  assertSoundCloudApiUrl: (input: string | URL) => {
    const url = input instanceof URL ? new URL(input) : new URL(input);

    if (url.origin !== 'https://api-v2.soundcloud.com') {
      throw new Error('SoundCloud returned an untrusted API pagination URL.');
    }

    return url;
  },
  soundCloudApi: {
    getJson: getJsonMock,
  },
}));

const { getFavoritesByProfileUrl, getSoundCloudTrackByUrl, getUserByProfileUrl } =
  await import('./soundcloud.service.js');

const user = {
  avatar_url: 'https://i1.sndcdn.com/avatars-user-large.jpg',
  id: 42,
  kind: 'user',
  permalink_url: 'https://soundcloud.com/artist',
  username: 'artist',
};

const track = (id: number, title = `Track ${id}`) => ({
  artwork_url: id === 1 ? 'https://i1.sndcdn.com/artworks-1-large.jpg' : null,
  duration: id * 1000,
  id,
  kind: 'track',
  permalink_url: `https://soundcloud.com/artist/track-${id}`,
  title,
  user: {
    avatar_url: 'https://i1.sndcdn.com/avatars-user-large.jpg',
    username: 'artist',
  },
});

const getJsonForRoutes = (routes: Record<string, unknown>) =>
  vi.fn(async (input: string | URL) => {
    const url = input instanceof URL ? input : new URL(input);

    if (url.pathname === '/resolve') {
      const resolvedUrl = url.searchParams.get('url');
      return routes[resolvedUrl ?? ''];
    }

    return routes[url.pathname + url.search] ?? routes[url.pathname];
  });

describe('SoundCloud metadata service', () => {
  beforeEach(() => {
    getJsonMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves profile URLs and maps the expected user contract', async () => {
    getJsonMock.mockResolvedValue(user);

    await expect(getUserByProfileUrl('http://www.soundcloud.com/artist/likes?ref=profile')).resolves.toEqual({
      avatar_url: 'https://i1.sndcdn.com/avatars-user-large.jpg',
      full_name: 'artist',
      id: 42,
      permalink_url: 'https://soundcloud.com/artist',
    });
    expect(getJsonMock.mock.calls[0][0].searchParams.get('url')).toBe('https://soundcloud.com/artist');
  });

  it('rejects resolved non-user records and invalid profile URLs', async () => {
    getJsonMock.mockResolvedValue({ ...track(1), kind: 'track' });

    await expect(getUserByProfileUrl('https://soundcloud.com/artist')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
    await expect(getUserByProfileUrl('https://soundcloud.com/artist/track')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
    expect(getJsonMock).toHaveBeenCalledTimes(1);
  });

  it('applies one metadata deadline through the API body read', async () => {
    vi.useFakeTimers();
    getJsonMock.mockImplementation(
      (_input: URL, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );
    const profileRequest = getUserByProfileUrl('https://soundcloud.com/artist');
    const profileRequestExpectation = expect(profileRequest).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 504,
    });

    await vi.advanceTimersByTimeAsync(30_000);
    await profileRequestExpectation;
    vi.useRealTimers();
  });

  it('maps SoundCloud track details while retaining duplicated artwork fields and milliseconds', async () => {
    getJsonMock.mockResolvedValue(track(5, 'A song'));

    await expect(getSoundCloudTrackByUrl('http://www.soundcloud.com/artist/track-5?secret_token=abc')).resolves.toEqual(
      {
        id: 5,
        user: 'artist',
        title: 'A song',
        artwork: {
          url: null,
        },
        artwork_url: null,
        permalink_url: 'https://soundcloud.com/artist/track-5',
        duration: 5000,
      },
    );
    expect(getJsonMock.mock.calls[0][0].searchParams.get('url')).toBe(
      'https://www.soundcloud.com/artist/track-5?secret_token=abc',
    );
  });

  it('includes final likes pages, skips deleted and playlist entries, and deduplicates in order', async () => {
    const firstPageUrl = '/users/42/likes?linked_partitioning=1&limit=200';
    const secondPageUrl = '/users/42/likes?cursor=second&limit=200';
    const getJson = getJsonForRoutes({
      'https://soundcloud.com/artist': user,
      [firstPageUrl]: {
        collection: [
          track(1),
          null,
          { kind: 'track-deleted' },
          { kind: 'like', track: null },
          { kind: 'like', track: { kind: 'playlist' } },
          { kind: 'like', track: track(1) },
          { kind: 'like', track: track(2) },
        ],
        next_href: `https://api-v2.soundcloud.com${secondPageUrl}`,
      },
      [secondPageUrl]: {
        collection: [{ kind: 'like', track: track(3) }],
        next_href: null,
      },
    });
    getJsonMock.mockImplementation(getJson);

    await expect(getFavoritesByProfileUrl('https://soundcloud.com/artist')).resolves.toMatchObject([
      { id: 1, title: 'Track 1' },
      { id: 2, title: 'Track 2' },
      { id: 3, title: 'Track 3' },
    ]);
    expect(getJson).toHaveBeenCalledTimes(3);
  });

  it('stops at an exact valid limit after skipping duplicates and null entries', async () => {
    const firstPageUrl = '/users/42/likes?linked_partitioning=1&limit=2';
    const secondPageUrl = '/users/42/likes?cursor=second&limit=1';
    const getJson = getJsonForRoutes({
      'https://soundcloud.com/artist': user,
      [firstPageUrl]: {
        collection: [track(1), null],
        next_href: `https://api-v2.soundcloud.com/users/42/likes?cursor=second&limit=200`,
      },
      [secondPageUrl]: {
        collection: [{ kind: 'like', track: track(1) }, { kind: 'like', track: track(2) }, track(3)],
        next_href: 'https://api-v2.soundcloud.com/users/42/likes?cursor=third',
      },
    });
    getJsonMock.mockImplementation(getJson);

    await expect(getFavoritesByProfileUrl('https://soundcloud.com/artist', 2)).resolves.toMatchObject([
      { id: 1 },
      { id: 2 },
    ]);
    expect(getJson).toHaveBeenCalledTimes(3);
  });

  it('rejects the whole likes result when a later page fails after earlier tracks were read', async () => {
    getJsonMock.mockImplementation(async (input: URL) => {
      if (input.pathname === '/resolve') {
        return user;
      }

      if (input.searchParams.get('cursor') === 'second') {
        throw new Error('connection reset');
      }

      return {
        collection: [track(1)],
        next_href: 'https://api-v2.soundcloud.com/users/42/likes?cursor=second',
      };
    });

    await expect(getFavoritesByProfileUrl('https://soundcloud.com/artist')).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 502,
    });
    expect(getJsonMock).toHaveBeenCalledTimes(3);
  });

  it('fails closed on malformed like items and untrusted or repeated continuations', async () => {
    getJsonMock.mockImplementation(
      vi
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ collection: [{ kind: 'unexpected' }], next_href: null }),
    );
    await expect(getFavoritesByProfileUrl('https://soundcloud.com/artist')).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 502,
    });

    getJsonMock.mockImplementation(
      vi.fn().mockImplementation(async (input: URL) => {
        if (input.pathname === '/resolve') {
          return user;
        }

        return {
          collection: [],
          next_href: 'https://example.com/users/42/likes',
        };
      }),
    );
    await expect(getFavoritesByProfileUrl('https://soundcloud.com/artist')).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 502,
    });

    getJsonMock.mockImplementation(
      vi.fn().mockImplementation(async (input: URL) => {
        if (input.pathname === '/resolve') {
          return user;
        }

        return {
          collection: [],
          next_href: input.toString(),
        };
      }),
    );
    await expect(getFavoritesByProfileUrl('https://soundcloud.com/artist')).rejects.toMatchObject({
      code: 'UPSTREAM_FAILURE',
      statusCode: 502,
    });
  });
});
