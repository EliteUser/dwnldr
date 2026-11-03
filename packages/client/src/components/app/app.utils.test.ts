import { describe, expect, it } from 'vitest';

import { readIncomingShare } from './app.utils';

const shareSearch = (values: Record<string, string>) => `?${new URLSearchParams(values)}`;

describe('readIncomingShare', () => {
  it('ignores ordinary query parameters', () => {
    expect(readIncomingShare('?url=https://soundcloud.com/artist/track')).toEqual({ status: 'none' });
  });

  it('prefers the shared URL over links in text and title', () => {
    const url = 'https://soundcloud.com/artist/track?in=artist/sets/mix';

    expect(
      readIncomingShare(shareSearch({ share_url: url, share_text: 'https://youtu.be/abc123', share_title: 'x' })),
    ).toEqual({ status: 'link', url });
  });

  it('extracts a link from shared text and trims trailing punctuation', () => {
    expect(readIncomingShare(shareSearch({ share_text: 'Listen here: (https://youtu.be/abc123).' }))).toEqual({
      status: 'link',
      url: 'https://youtu.be/abc123',
    });
  });

  it('reports a share without any web link', () => {
    expect(readIncomingShare(shareSearch({ share_text: 'hello ftp://soundcloud.com/artist/track' }))).toEqual({
      status: 'no-link',
    });
  });
});
