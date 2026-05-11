import { describe, expect, it } from 'vitest';

import { getProxiedImageUrl } from './image-url.utils';

describe('image URL utils', () => {
  it('proxies remote HTTPS images through the same-origin artwork endpoint', () => {
    expect(getProxiedImageUrl('https://img.example.test/cover.jpg')).toBe(
      '/api/artwork?url=https%3A%2F%2Fimg.example.test%2Fcover.jpg',
    );
  });

  it('proxies remote HTTP images to avoid mixed content on HTTPS app origins', () => {
    expect(getProxiedImageUrl('http://img.example.test/cover.jpg')).toBe(
      '/api/artwork?url=http%3A%2F%2Fimg.example.test%2Fcover.jpg',
    );
  });

  it('keeps same-origin, blob, and empty image URLs unchanged', () => {
    expect(getProxiedImageUrl('/pwa-icon-192.png')).toBe('/pwa-icon-192.png');
    expect(getProxiedImageUrl('blob:http://localhost/blob-id')).toBe('blob:http://localhost/blob-id');
    expect(getProxiedImageUrl(undefined)).toBe('');
  });
});
