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
      readIncomingShare(
        shareSearch({
          share_url: url,
          share_text: 'https://youtu.be/abc123',
          share_title: 'https://youtube.com/watch?v=other',
        }),
      ),
    ).toEqual({ status: 'supported', url });
  });

  it('extracts a supported link from shared text and trims trailing punctuation', () => {
    expect(readIncomingShare(shareSearch({ share_text: 'Listen here: (https://youtu.be/abc123).' }))).toEqual({
      status: 'supported',
      url: 'https://youtu.be/abc123',
    });
  });

  it('uses a supported title link when URL and text contain no supported link', () => {
    expect(
      readIncomingShare(
        shareSearch({
          share_url: 'https://example.com/track',
          share_text: 'No URL here',
          share_title: 'https://soundcloud.com/artist/track',
        }),
      ),
    ).toEqual({ status: 'supported', url: 'https://soundcloud.com/artist/track' });
  });

  it('rejects malformed, unsupported, and non-HTTP links', () => {
    expect(
      readIncomingShare(
        shareSearch({
          share_url: 'https://',
          share_text: 'https://example.com/track ftp://soundcloud.com/artist/track',
        }),
      ),
    ).toEqual({ status: 'unsupported' });
  });
});
