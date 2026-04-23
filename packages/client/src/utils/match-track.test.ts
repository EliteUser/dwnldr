import { describe, expect, it } from 'vitest';

import { isTrackDownloaded, isTrackMatch, normalizeTrackName } from './match-track';

describe('normalizeTrackName', () => {
  it('normalizes unicode, punctuation, and separators while preserving words', () => {
    expect(normalizeTrackName('Café Del Mar – Artist & Guest (Extended Mix)')).toBe(
      'cafe del mar artist and guest extended mix',
    );
  });

  it('folds every common unicode apostrophe variant to the same token', () => {
    const variants = ["Don't", 'Don\u2019t', 'Don\u2018t', 'Don\u02BCt', 'Don\u2032t'];

    for (const variant of variants) {
      expect(normalizeTrackName(variant)).toBe('dont');
    }
  });

  it('drops feat. / featuring / ft. markers but keeps the featured artist tokens', () => {
    expect(normalizeTrackName('Artist feat. Guest - Track')).toBe('artist guest track');
    expect(normalizeTrackName('Artist featuring Guest - Track')).toBe('artist guest track');
    expect(normalizeTrackName('Artist ft. Guest - Track')).toBe('artist guest track');
  });
});

describe('isTrackMatch', () => {
  const matchingCases = [
    ['Artist - Track Name', 'Artist - Track Name'],
    ['Artist - Track Name', 'Track Name'],
    ['Alok & Illenium - To The Moon', 'Alok - To The Moon'],
    ['Café Del Mar', 'Cafe Del Mar'],
    ['Artist – Track Name', 'Artist - Track Name'],
    ['Artist | Track Name', 'Track Name'],
    ['Artist feat. Guest - Track Name', 'Artist - Track Name'],
    ['Artist - Track Name (Extended Mix)', 'Artist - Track Name'],
    ['Artist - Track Name [Free Download]', 'Artist - Track Name'],
    ['Artist and Other - Track Name', 'Artist & Other - Track Name'],
    ['AVICII - Levels', 'Levels'],
    ['Artist - Track Name', '01 Artist - Track Name'],
    ['Some Song', 'Some-Song'],
    // YouTube-style decorations
    ['Artist - Track Name (Official Music Video)', 'Artist - Track Name'],
    ['Artist - Track Name [Official Audio]', 'Artist - Track Name'],
    ['Artist - Track Name (Lyric Video)', 'Artist - Track Name'],
    ['Artist - Track Name (HD)', 'Artist - Track Name'],
    // Producer annotations
    ['Artist - Track Name (prod. Producer)', 'Artist - Track Name'],
    ['Artist - Track Name (Prod. By Some Guy)', 'Artist - Track Name'],
    // Apostrophe variants across the two sides
    ['Artist - Don\u2019t Stop', "Artist - Don't Stop"],
    ['Artist - Don\u2018t Stop', "Artist - Don't Stop"],
    ['Artist - Dont Stop', "Artist - Don't Stop"],
    // Multiple featured artists
    ['Alok feat. Illenium & Kiiara - To The Moon', 'Alok - To The Moon'],
  ] as const;

  const nonMatchingCases = [
    ['Artist - Another Track', 'Artist - Track Name'],
    ['Different Artist - To The Sun', 'Alok - To The Moon'],
    ['Homebound', 'Home'],
    ['Go', 'Good Ones'],
    ['Artist - Track Name 2', 'Artist - Track Name'],
    ['Artist - Track 1', 'Artist - Track 3'],
    ['Hello', 'Hello World Goodbye'],
    ['', 'Artist - Track Name'],
    ['Artist - Track Name', ''],
  ] as const;

  for (const [trackTitle, fileName] of matchingCases) {
    it(`matches "${trackTitle}" with "${fileName}"`, () => {
      expect(isTrackMatch(trackTitle, fileName)).toBe(true);
    });
  }

  for (const [trackTitle, fileName] of nonMatchingCases) {
    it(`does not match "${trackTitle}" with "${fileName}"`, () => {
      expect(isTrackMatch(trackTitle, fileName)).toBe(false);
    });
  }
});

describe('isTrackDownloaded', () => {
  it('returns true when any synced file matches the cloud track title', () => {
    expect(
      isTrackDownloaded(
        [
          { name: 'Unrelated Artist - Another Song', extension: 'mp3' },
          { name: 'Alok - To The Moon', extension: 'mp3' },
        ],
        'Alok & Illenium - To The Moon',
      ),
    ).toBe(true);
  });

  it('returns false when no synced file matches the cloud track title', () => {
    expect(
      isTrackDownloaded(
        [{ name: 'Unrelated Artist - Another Song', extension: 'mp3' }],
        'Alok & Illenium - To The Moon',
      ),
    ).toBe(false);
  });
});
