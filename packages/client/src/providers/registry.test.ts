import { describe, expect, it } from 'vitest';

import { classifySource, getProvider, getProviderByUrl, resolveSourceInfo } from './registry';

describe('provider registry', () => {
  it('selects providers from supported URLs', () => {
    expect(classifySource('https://www.youtube.com/watch?v=video')).toBe('youtube');
    expect(classifySource('https://youtu.be/video')).toBe('youtube');
    expect(classifySource('https://soundcloud.com/artist/track')).toBe('soundcloud');
    expect(classifySource('https://on.soundcloud.com/example')).toBe('soundcloud');
  });

  it('rejects unsupported and malformed URLs', () => {
    expect(getProviderByUrl('https://example.com/track')).toBeUndefined();
    expect(classifySource('not-a-url')).toBeNull();
    expect(resolveSourceInfo('https://example.com/track')).toBeNull();
  });

  it('exposes provider adapters and capabilities', () => {
    expect(getProvider('soundcloud')?.capabilities.collections).toBe(true);
    expect(getProvider('youtube')?.capabilities.collections).toBe(false);
    expect(
      getProvider('youtube')?.toDownloadName({
        title: 'Track',
        user: 'Artist',
      }),
    ).toBe('Artist - Track');
  });
});
