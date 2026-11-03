import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as httpService from './http/http.service.js';
import { HttpStatusError } from './http/http.service.js';

const { fetchHttpJsonMock, fetchHttpTextMock } = vi.hoisted(() => ({
  fetchHttpJsonMock: vi.fn(),
  fetchHttpTextMock: vi.fn(),
}));

vi.mock('./http/http.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof httpService>()),
  fetchHttpJson: fetchHttpJsonMock,
  fetchHttpText: fetchHttpTextMock,
}));

const { getLikes, getProfile, getTrack, normalizeProfileUrl } = await import('./soundcloud.js');

const signal = new AbortController().signal;

const scTrack = (id: number, overrides: Record<string, unknown> = {}) => ({
  artwork_url: `https://i1.sndcdn.com/artworks-${id}-large.jpg`,
  duration: 1000 * id,
  id,
  kind: 'track',
  permalink_url: `https://soundcloud.com/artist/track-${id}`,
  title: `Track ${id}`,
  user: { avatar_url: 'https://i1.sndcdn.com/avatars-1-large.jpg', username: 'Artist' },
  ...overrides,
});

const user = { id: 7, kind: 'user', username: 'artist', full_name: ' Artist Name ', avatar_url: null };

const requestedUrls = () => fetchHttpJsonMock.mock.calls.map(([url]: [URL]) => url);

beforeEach(() => {
  vi.clearAllMocks();
  fetchHttpTextMock.mockImplementation(async (url: string) =>
    url === 'https://soundcloud.com/'
      ? '<script crossorigin src="https://a-v2.sndcdn.com/assets/app.js"></script>'
      : 'e={client_id:"abcdefghijklmnop1234"}',
  );
});

describe('SoundCloud service', () => {
  it('resolves a track and maps it to the shared shape', async () => {
    fetchHttpJsonMock.mockResolvedValue(scTrack(1, { artwork_url: null }));

    await expect(getTrack('https://soundcloud.com/artist/track-1', signal)).resolves.toEqual({
      id: '1',
      url: 'https://soundcloud.com/artist/track-1',
      title: 'Track 1',
      artist: 'Artist',
      durationMs: 1000,
      artworkUrl: 'https://i1.sndcdn.com/avatars-1-large.jpg',
    });
    expect(requestedUrls()[0].searchParams.get('client_id')).toBe('abcdefghijklmnop1234');
  });

  it('rediscovers the client ID once when SoundCloud rejects it', async () => {
    fetchHttpJsonMock.mockRejectedValueOnce(new HttpStatusError(401)).mockResolvedValueOnce(scTrack(2));

    await expect(getTrack('https://soundcloud.com/artist/track-2', signal)).resolves.toMatchObject({ id: '2' });
    expect(fetchHttpJsonMock).toHaveBeenCalledTimes(2);
  });

  it('reports a link to something other than a track as invalid input', async () => {
    fetchHttpJsonMock.mockResolvedValue({ kind: 'playlist' });

    await expect(getTrack('https://soundcloud.com/artist/sets/x', signal)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_INPUT',
    });
  });

  it('maps a missing resource to NOT_FOUND', async () => {
    fetchHttpJsonMock.mockRejectedValue(new HttpStatusError(404));

    await expect(getProfile('https://soundcloud.com/nobody', signal)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns a profile with a trimmed display name', async () => {
    fetchHttpJsonMock.mockResolvedValue(user);

    await expect(getProfile('https://soundcloud.com/artist/likes', signal)).resolves.toEqual({
      id: '7',
      name: 'Artist Name',
      url: 'https://soundcloud.com/artist',
      avatarUrl: null,
    });
  });

  it('collects liked tracks across pages, skipping playlists, broken entries and duplicates', async () => {
    fetchHttpJsonMock
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({
        collection: [{ track: scTrack(1) }, { playlist: { id: 9 } }, { track: { kind: 'track' } }],
        next_href: 'https://api-v2.soundcloud.com/users/7/likes?offset=1',
      })
      .mockResolvedValueOnce({ collection: [{ track: scTrack(1) }, { track: scTrack(2) }], next_href: null });

    const likes = await getLikes('https://soundcloud.com/artist', signal);

    expect(likes.map(({ id }) => id)).toEqual(['1', '2']);
  });

  it('refuses pagination links outside the SoundCloud API', async () => {
    fetchHttpJsonMock
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ collection: [], next_href: 'https://evil.example/likes' });

    await expect(getLikes('https://soundcloud.com/artist', signal)).rejects.toMatchObject({ statusCode: 502 });
    expect(fetchHttpJsonMock).toHaveBeenCalledTimes(2);
  });
});

describe('normalizeProfileUrl', () => {
  it.each([
    ['https://soundcloud.com/artist', 'https://soundcloud.com/artist'],
    ['http://m.soundcloud.com/artist/likes', 'https://soundcloud.com/artist'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeProfileUrl(input)).toBe(expected);
  });

  it.each(['https://soundcloud.com/', 'https://soundcloud.com/artist/track', 'https://example.com/artist'])(
    'rejects %s',
    (input) => {
      expect(() => normalizeProfileUrl(input)).toThrow('Enter a SoundCloud profile URL.');
    },
  );
});
