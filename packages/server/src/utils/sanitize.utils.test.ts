import { describe, expect, it } from 'vitest';

import { getContentDispositionHeader, sanitizeFilename } from './sanitize.utils.js';

describe('sanitizeFilename', () => {
  it('replaces filesystem-invalid characters', () => {
    expect(sanitizeFilename('AC/DC - Highway: To? Hell')).toBe('AC-DC - Highway- To- Hell');
  });

  it('collapses multiple consecutive invalid characters into one hyphen', () => {
    expect(sanitizeFilename('track:/?name')).toBe('track-name');
  });

  it('avoids reserved Windows file names (uppercase)', () => {
    expect(sanitizeFilename('CON')).toBe('track-CON');
  });

  it('avoids reserved Windows file names (lowercase)', () => {
    expect(sanitizeFilename('nul')).toBe('track-nul');
  });

  it('avoids reserved Windows file names with extension', () => {
    expect(sanitizeFilename('COM1.txt')).toBe('track-COM1.txt');
  });

  it('trims trailing dots and spaces', () => {
    expect(sanitizeFilename('My Track...')).toBe('My Track');
    expect(sanitizeFilename('My Track   ')).toBe('My Track');
  });

  it('truncates names longer than 200 characters', () => {
    const longName = 'a'.repeat(250);
    expect(sanitizeFilename(longName).length).toBe(200);
  });

  it('falls back to a safe default for empty names', () => {
    expect(sanitizeFilename('   ')).toBe('track');
  });

  it('falls back to a safe default for names that are only invalid characters', () => {
    expect(sanitizeFilename('///')).toBe('track');
  });
});

describe('getContentDispositionHeader', () => {
  it('includes an RFC 5987 encoded filename for non-ascii values', () => {
    expect(getContentDispositionHeader('Björk "Live".mp3')).toBe(
      `attachment; filename="Bj_rk -Live-.mp3"; filename*=UTF-8''Bj%C3%B6rk%20%22Live%22.mp3`,
    );
  });
});
