import { describe, expect, it, vi } from 'vitest';

import { readResponseBuffer, ResponseSizeLimitError } from './response-buffer.service.js';

describe('readResponseBuffer', () => {
  it('cancels the response when the declared size exceeds the limit', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const response = {
      body: {
        cancel,
      },
      headers: new Headers({
        'content-length': '11',
      }),
    } as unknown as Response;

    await expect(readResponseBuffer(response, 10)).rejects.toBeInstanceOf(ResponseSizeLimitError);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('cancels a stream as soon as its received bytes exceed the limit', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const releaseLock = vi.fn();
    const read = vi.fn().mockResolvedValue({
      done: false,
      value: new Uint8Array(11),
    });
    const response = {
      body: {
        getReader: () => ({
          cancel,
          read,
          releaseLock,
        }),
      },
      headers: new Headers(),
    } as unknown as Response;

    await expect(readResponseBuffer(response, 10)).rejects.toBeInstanceOf(ResponseSizeLimitError);
    expect(cancel).toHaveBeenCalledOnce();
    expect(releaseLock).toHaveBeenCalledOnce();
  });
});
