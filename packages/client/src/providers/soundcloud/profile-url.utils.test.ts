import { describe, expect, it } from 'vitest';

import { normalizeSoundCloudProfileUrl } from './profile-url.utils';

describe('normalizeSoundCloudProfileUrl', () => {
  it.each([
    ['https://soundcloud.com/artist', 'https://soundcloud.com/artist'],
    ['http://www.soundcloud.com/artist/', 'https://soundcloud.com/artist'],
    ['https://m.soundcloud.com/artist/likes?utm_source=test#likes', 'https://soundcloud.com/artist'],
    ['https://soundcloud.com/Artist_Name/?ref=profile', 'https://soundcloud.com/Artist_Name'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeSoundCloudProfileUrl(input)).toBe(expected);
  });

  it.each([
    '',
    'artist',
    'https://soundcloud.com/123456',
    'https://soundcloud.com/artist/track-name',
    'https://soundcloud.com/artist/sets/mix',
    'https://soundcloud.com/artist/likes/tracks',
    'https://soundcloud.com/search',
    'https://soundcloud.com/stream',
    'https://soundcloud.com/likes',
    'https://soundcloud.com/login',
    'https://soundcloud.com/users',
    'https://soundcloud.com/messages',
    'https://soundcloud.com/music',
    'https://soundcloud.com/popular',
    'https://soundcloud.com/you',
    'https://soundcloud.com.evil.example/artist',
    'https://example.com/artist',
    'ftp://soundcloud.com/artist',
    'https://user@soundcloud.com/artist',
    'https://soundcloud.com:8443/artist',
    'https://soundcloud.com/artist%2Ftrack',
  ])('rejects unsupported URL %s', (input) => {
    expect(normalizeSoundCloudProfileUrl(input)).toBeNull();
  });
});
