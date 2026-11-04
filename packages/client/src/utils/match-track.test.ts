import { describe, expect, it } from 'vitest';

import { createDownloadedTrackMatcher, isTrackMatch, normalizeTrackName } from './match-track';

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
    // Non-Latin scripts
    ['Кино - Группа крови', 'Кино - Группа крови'],
    ['Ёлка - Прованс', 'Елка - Прованс'],
    // Numbers that do not identify the song
    ['Artist - Track Name (2019 Remaster)', 'Artist - Track Name'],
    ['Artist - Track Name [128 BPM]', 'Artist - Track Name'],
    ['Artist - Track Name', 'Artist - Track Name (1)'],
  ] as const;

  const nonMatchingCases = [
    ['Artist - Another Track', 'Artist - Track Name'],
    ['Different Artist - To The Sun', 'Alok - To The Moon'],
    ['Homebound', 'Home'],
    ['Go', 'Good Ones'],
    ['Artist - Track Name 2', 'Artist - Track Name'],
    ['Artist - Track 1', 'Artist - Track 3'],
    ['Hello', 'Hello World Goodbye'],
    ['Artist - Track Name (Part 2)', 'Artist - Track Name'],
    ['Кино - Группа крови', 'Кино - Звезда по имени Солнце'],
    ['Artist - Трек', 'Artist - Песня'],
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

describe('createDownloadedTrackMatcher', () => {
  it('matches cloud titles against the synced file names', () => {
    const isDownloaded = createDownloadedTrackMatcher([
      { name: 'Unrelated Artist - Another Song', extension: 'mp3' },
      { name: 'Alok - To The Moon', extension: 'mp3' },
    ]);

    expect(isDownloaded('Alok & Illenium', 'To The Moon')).toBe(true);
    expect(isDownloaded('Different Artist', 'To The Sun')).toBe(false);
    expect(createDownloadedTrackMatcher([])('Alok', 'To The Moon')).toBe(false);
  });

  it('matches a filename author against the uploader handle or the author inside the cloud title', () => {
    const isDownloaded = createDownloadedTrackMatcher([
      { name: 'Alok - To The Moon', extension: 'mp3' },
      { name: 'Some Artist - Track', extension: 'mp3' },
    ]);

    expect(isDownloaded('alokmusic', 'To The Moon')).toBe(true);
    expect(isDownloaded('user-123456789', 'Some Artist - Track')).toBe(true);
    expect(isDownloaded('Label Channel', 'Some Artist - Track (Extended Mix)')).toBe(true);
  });

  it('still requires the author to match when only the track name does', () => {
    const isDownloaded = createDownloadedTrackMatcher([{ name: 'Other Artist - To The Moon', extension: 'mp3' }]);

    expect(isDownloaded('alokmusic', 'To The Moon')).toBe(false);
    expect(isDownloaded('Other Artist', 'To The Sun')).toBe(false);
  });
});
