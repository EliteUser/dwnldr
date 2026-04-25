import { describe, expect, it } from 'vitest';

import { getContainedImageSize } from './artwork-editor.utils';

describe('artwork editor utils', () => {
  it('fits landscape images without changing their aspect ratio', () => {
    expect(getContainedImageSize({ width: 1600, height: 900 }, { width: 720, height: 420 })).toEqual({
      width: 720,
      height: 405,
    });
  });

  it('fits portrait images without changing their aspect ratio', () => {
    expect(getContainedImageSize({ width: 900, height: 1600 }, { width: 720, height: 420 })).toEqual({
      width: 236.25,
      height: 420,
    });
  });
});
