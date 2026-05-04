import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRemoteArtworkFile } from './artwork.utils';

class TestImage {
  crossOrigin = '';
  naturalHeight = 512;
  naturalWidth = 512;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

describe('artwork utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads remote artwork through the same-origin artwork proxy', async () => {
    vi.stubGlobal('Image', TestImage);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          'content-type': 'image/png',
        },
      }),
    );

    const file = await loadRemoteArtworkFile('https://img.example.test/cover.png');

    expect(fetchMock).toHaveBeenCalledWith('/api/artwork?url=https%3A%2F%2Fimg.example.test%2Fcover.png');
    expect(file).toMatchObject({
      name: 'artwork.png',
      type: 'image/png',
    });
  });
});
