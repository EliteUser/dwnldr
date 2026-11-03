import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchHttpJson, fetchHttpText, HttpStatusError } from './http.service.js';

const signal = new AbortController().signal;

describe('HTTP transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads text and parses JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('page content')).mockResolvedValueOnce(new Response('{"value":2}')),
    );

    await expect(fetchHttpText('https://example.com/page', { signal })).resolves.toBe('page content');
    await expect(fetchHttpJson('https://example.com/data', { signal })).resolves.toEqual({ value: 2 });
  });

  it('exposes the HTTP status of failed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('unavailable', { status: 503 })));

    await expect(fetchHttpText('https://example.com/down', { signal })).rejects.toMatchObject({
      status: 503,
      constructor: HttpStatusError,
    });
  });
});
