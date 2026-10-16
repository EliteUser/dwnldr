import { describe, expect, it } from 'vitest';

import { HttpError } from '../../errors/http-error.js';
import { normalizeSoundCloudProfileUrl, normalizeSoundCloudTrackUrl } from './soundcloud.profile.js';

describe('normalizeSoundCloudProfileUrl', () => {
  it.each([
    ['https://soundcloud.com/artist', 'https://soundcloud.com/artist'],
    ['http://www.soundcloud.com/Artist_Name/likes?ref=profile#likes', 'https://soundcloud.com/Artist_Name'],
    ['https://m.soundcloud.com/artist/?utm_source=test', 'https://soundcloud.com/artist'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeSoundCloudProfileUrl(input)).toBe(expected);
  });

  it.each([
    'https://soundcloud.com/123456',
    'https://soundcloud.com/artist/track-name',
    'https://soundcloud.com/artist/sets/mix',
    'https://soundcloud.com/artist/likes/tracks',
    'https://soundcloud.com/search',
    'https://soundcloud.com/you',
    'https://soundcloud.com/artist%2Ftrack',
    'https://soundcloud.com/artist%3Fdebug',
    'https://soundcloud.com/artist%23debug',
    'https://soundcloud.com:8443/artist',
    'https://user@soundcloud.com/artist',
  ])('rejects unsupported profile URL %s', (input) => {
    expect(() => normalizeSoundCloudProfileUrl(input)).toThrow(HttpError);
  });
});

describe('normalizeSoundCloudTrackUrl', () => {
  it('preserves provider host, path, and secret query parameters', () => {
    expect(
      normalizeSoundCloudTrackUrl('http://www.soundcloud.com/artist/track?secret_token=s-123&in=artist/sets/mix#track'),
    ).toBe('https://www.soundcloud.com/artist/track?secret_token=s-123&in=artist/sets/mix');
  });

  it('rejects invalid hosts, ports, and malformed path escapes', () => {
    for (const input of [
      'https://example.com/artist/track',
      'https://soundcloud.com:8443/artist/track',
      'https://soundcloud.com/artist/%E0%A4%A',
    ]) {
      expect(() => normalizeSoundCloudTrackUrl(input)).toThrow(HttpError);
    }
  });
});
