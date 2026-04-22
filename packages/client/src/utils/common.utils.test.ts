import { describe, expect, it } from 'vitest';

import { classifySource } from './common.utils';

describe('classifySource', () => {
  it('detects YouTube URLs', () => {
    expect(classifySource('https://www.youtube.com/watch?v=video')).toBe('youtube');
    expect(classifySource('https://youtu.be/video')).toBe('youtube');
  });

  it('detects SoundCloud URLs', () => {
    expect(classifySource('https://soundcloud.com/artist/track')).toBe('soundcloud');
    expect(classifySource('https://on.soundcloud.com/example')).toBe('soundcloud');
  });

  it('rejects unsupported and malformed URLs', () => {
    expect(classifySource('https://example.com/track')).toBeNull();
    expect(classifySource('not-a-url')).toBeNull();
  });
});
