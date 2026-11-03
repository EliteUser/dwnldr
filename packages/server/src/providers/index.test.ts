import { describe, expect, it } from 'vitest';

import { findProvider } from './index.js';

describe('findProvider', () => {
  it.each([
    ['https://soundcloud.com/artist/track', 'soundcloud'],
    ['https://m.soundcloud.com/artist/track', 'soundcloud'],
    ['https://on.soundcloud.com/abc123', 'soundcloud'],
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://music.youtube.com/watch?v=abc', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['http://YouTube.com/watch?v=abc', 'youtube'],
  ])('matches %s to %s', (url, key) => {
    expect(findProvider(url)?.key).toBe(key);
  });

  it.each([
    'https://example.com/track',
    'https://notsoundcloud.com/artist/track',
    'https://soundcloud.com.evil.example/track',
    'ftp://soundcloud.com/artist/track',
    'not a url',
  ])('rejects %s', (url) => {
    expect(findProvider(url)).toBeUndefined();
  });
});
