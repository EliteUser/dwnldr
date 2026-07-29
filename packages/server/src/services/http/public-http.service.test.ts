import { describe, expect, it, vi } from 'vitest';

import {
  createPinnedLookup,
  createPublicHttpFetcher,
  isPublicAddress,
  UnsafeRemoteUrlError,
  validatePublicHttpUrlShape,
} from './public-http.service.js';

describe('public HTTP service', () => {
  it('returns the pinned address in the shape requested by Node', () => {
    const address = {
      address: '93.184.216.34',
      family: 4 as const,
    };
    const lookup = createPinnedLookup(address);
    const lookupOneCallback = vi.fn();
    const lookupAllCallback = vi.fn();

    lookup('example.com', { all: false }, lookupOneCallback);
    lookup('example.com', { all: true }, lookupAllCallback);

    expect(lookupOneCallback).toHaveBeenCalledWith(null, address.address, address.family);
    expect(lookupAllCallback).toHaveBeenCalledWith(null, [address]);
  });

  it.each([
    '127.0.0.1',
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.0.1',
    '192.0.2.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '240.0.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '::ffff:100.64.0.1',
    '::ffff:169.254.169.254',
    '::ffff:192.168.0.1',
    '2001:db8::1',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('accepts public address %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each(['file:///etc/passwd', 'https://user:password@example.com/image.png', 'https://example.com:8443/image.png'])(
    'rejects unsafe URL shape %s',
    (url) => {
      expect(() => validatePublicHttpUrlShape(new URL(url))).toThrow(UnsafeRemoteUrlError);
    },
  );

  it.each(['http://example.com/image.png', 'https://example.com/image.png'])('accepts safe URL shape %s', (url) => {
    expect(() => validatePublicHttpUrlShape(new URL(url))).not.toThrow();
  });

  it('rejects hostnames with mixed public and private DNS answers before connecting', async () => {
    const requestPinned = vi.fn();
    const fetcher = createPublicHttpFetcher({
      lookupAll: async () => [
        { address: '8.8.8.8', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ],
      requestPinned,
    });

    await expect(fetcher('https://example.com/image.png')).rejects.toBeInstanceOf(UnsafeRemoteUrlError);
    expect(requestPinned).not.toHaveBeenCalled();
  });

  it('tries each validated address without resolving the hostname again', async () => {
    const lookupAll = vi.fn().mockResolvedValue([
      { address: '2606:4700:4700::1111', family: 6 },
      { address: '1.1.1.1', family: 4 },
    ]);
    const requestPinned = vi
      .fn()
      .mockRejectedValueOnce(new Error('IPv6 network is unreachable'))
      .mockResolvedValueOnce(new Response('image'));
    const fetcher = createPublicHttpFetcher({ lookupAll, requestPinned });

    await expect(fetcher('https://example.com/image.png')).resolves.toBeInstanceOf(Response);
    expect(lookupAll).toHaveBeenCalledTimes(1);
    expect(requestPinned).toHaveBeenNthCalledWith(
      1,
      new URL('https://example.com/image.png'),
      { address: '2606:4700:4700::1111', family: 6 },
      {},
    );
    expect(requestPinned).toHaveBeenNthCalledWith(
      2,
      new URL('https://example.com/image.png'),
      { address: '1.1.1.1', family: 4 },
      {},
    );
  });

  it('does not try another address after the shared abort signal fires', async () => {
    const abortController = new AbortController();
    const requestPinned = vi.fn().mockImplementationOnce(async () => {
      abortController.abort();
      throw new DOMException('Timed out', 'AbortError');
    });
    const fetcher = createPublicHttpFetcher({
      lookupAll: async () => [
        { address: '8.8.8.8', family: 4 },
        { address: '1.1.1.1', family: 4 },
      ],
      requestPinned,
    });

    await expect(
      fetcher('https://example.com/image.png', {
        signal: abortController.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(requestPinned).toHaveBeenCalledTimes(1);
  });

  it('revalidates redirect destinations before connecting to them', async () => {
    const lookupAll = vi
      .fn()
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    const requestPinned = vi.fn().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: 'http://internal.example/metadata',
        },
      }),
    );
    const fetcher = createPublicHttpFetcher({ lookupAll, requestPinned });

    await expect(fetcher('https://example.com/image.png')).rejects.toBeInstanceOf(UnsafeRemoteUrlError);
    expect(requestPinned).toHaveBeenCalledTimes(1);
  });

  it('rejects unsafe URL attributes introduced by a redirect', async () => {
    const requestPinned = vi.fn().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: 'https://user:password@example.com/private',
        },
      }),
    );
    const fetcher = createPublicHttpFetcher({
      lookupAll: async () => [{ address: '8.8.8.8', family: 4 }],
      requestPinned,
    });

    await expect(fetcher('https://example.com/image.png')).rejects.toBeInstanceOf(UnsafeRemoteUrlError);
    expect(requestPinned).toHaveBeenCalledTimes(1);
  });

  it('stops redirect loops after three redirects', async () => {
    const requestPinned = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: '/image.png',
        },
      }),
    );
    const fetcher = createPublicHttpFetcher({
      lookupAll: async () => [{ address: '8.8.8.8', family: 4 }],
      requestPinned,
    });

    await expect(fetcher('https://example.com/image.png')).rejects.toBeInstanceOf(UnsafeRemoteUrlError);
    expect(requestPinned).toHaveBeenCalledTimes(4);
  });
});
