export class ResponseSizeLimitError extends Error {
  constructor() {
    super('Response body exceeded the configured size limit.');
    this.name = 'ResponseSizeLimitError';
  }
}

export const cancelResponseBody = async (response: Response) => {
  await response.body?.cancel().catch(() => undefined);
};

export const readResponseBuffer = async (response: Response, maxSize: number) => {
  const contentLength = Number(response.headers.get('content-length'));

  if (Number.isFinite(contentLength) && contentLength > maxSize) {
    await cancelResponseBody(response);
    throw new ResponseSizeLimitError();
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > maxSize) {
      throw new ResponseSizeLimitError();
    }

    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return Buffer.concat(chunks, size);
      }

      size += value.byteLength;

      if (size > maxSize) {
        await reader.cancel().catch(() => undefined);
        throw new ResponseSizeLimitError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
};
