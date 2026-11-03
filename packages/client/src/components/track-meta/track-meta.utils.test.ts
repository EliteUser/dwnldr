import { describe, expect, it } from 'vitest';

import { getId3TagLength } from './track-meta.utils';

const id3Header = (size: number, flags = 0) =>
  new Uint8Array([
    0x49,
    0x44,
    0x33,
    4,
    0,
    flags,
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ]);

describe('getId3TagLength', () => {
  it('reads the syncsafe tag size from the header', async () => {
    expect(await getId3TagLength(new Blob([id3Header(20 * 1024 * 1024), new Uint8Array(32)]))).toBe(
      10 + 20 * 1024 * 1024,
    );
  });

  it('includes the footer when the header announces one', async () => {
    expect(await getId3TagLength(new Blob([id3Header(100, 0x10)]))).toBe(120);
  });

  it('returns 0 for files without an ID3v2 tag', async () => {
    expect(await getId3TagLength(new Blob(['not a tag at all']))).toBe(0);
  });
});
