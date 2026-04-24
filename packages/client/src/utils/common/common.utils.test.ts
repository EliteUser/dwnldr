import { describe, expect, it } from 'vitest';

import { getDuration, getFileData } from './common.utils';

describe('getFileData', () => {
  it('keeps extensionless file names intact', () => {
    expect(getFileData('Artist - Track')).toEqual({
      name: 'Artist - Track',
      extension: '',
    });
  });
});

describe('getDuration', () => {
  it('formats milliseconds into mm:ss', () => {
    expect(getDuration(210000)).toBe('3:30');
    expect(getDuration(0)).toBe('0:00');
    expect(getDuration(59999)).toBe('0:59');
  });

  it('returns 0:00 for non-finite or negative values', () => {
    expect(getDuration(NaN)).toBe('0:00');
    expect(getDuration(Infinity)).toBe('0:00');
    expect(getDuration(-1000)).toBe('0:00');
  });
});
