import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchHttpJson,
  fetchHttpText,
  HttpDeadlineExceededError,
  HttpResponseParseError,
  HttpStatusError,
} from './http.service.js';

describe('HTTP transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reads text and parses JSON through the shared transport', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('page content'))
      .mockResolvedValueOnce(
        new Response('{"value":2}', {
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchHttpText('https://example.com/page')).resolves.toBe('page content');
    await expect(fetchHttpJson<{ value: number }>('https://example.com/data')).resolves.toEqual({ value: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves HTTP statuses and rejects malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('unavailable', { status: 503, statusText: 'Unavailable' }))
        .mockResolvedValueOnce(new Response('{broken')),
    );

    await expect(fetchHttpText('https://example.com/down')).rejects.toBeInstanceOf(HttpStatusError);
    await expect(fetchHttpJson('https://example.com/broken')).rejects.toBeInstanceOf(HttpResponseParseError);
  });

  it('enforces the timeout while the request is pending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
          }),
      ),
    );

    await expect(fetchHttpText('https://example.com/slow', { timeoutMs: 5 })).rejects.toBeInstanceOf(
      HttpDeadlineExceededError,
    );
  });

  it('enforces the timeout while reading a delayed body after receiving headers and a partial chunk', async () => {
    let markFirstChunkSent!: () => void;
    const firstChunkSent = new Promise<void>((resolve) => {
      markFirstChunkSent = resolve;
    });
    let delayedResponseTimer: ReturnType<typeof setTimeout> | undefined;
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-length': '100' });
      response.flushHeaders();
      response.write('partial', markFirstChunkSent);
      delayedResponseTimer = setTimeout(() => response.end('x'.repeat(93)), 2_000);
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address() as AddressInfo;
    const request = fetchHttpText(`http://127.0.0.1:${address.port}/delayed-body`, { timeoutMs: 500 });

    try {
      await firstChunkSent;
      await expect(request).rejects.toBeInstanceOf(HttpDeadlineExceededError);
    } finally {
      clearTimeout(delayedResponseTimer);
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
