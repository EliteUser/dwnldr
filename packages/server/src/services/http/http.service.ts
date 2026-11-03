import { cancelResponseBody, readResponseBuffer } from './response-buffer.service.js';

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export class HttpStatusError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP request failed with status ${status}.`);
    this.name = 'HttpStatusError';
  }
}

type HttpRequestOptions = {
  headers?: Record<string, string>;
  signal: AbortSignal;
};

/** Fetches a trusted, fixed URL (no redirects) and reads at most 10 MB of its body. */
export const fetchHttpText = async (input: string | URL, { headers, signal }: HttpRequestOptions) => {
  const response = await fetch(input, { headers, redirect: 'error', signal });

  if (!response.ok) {
    await cancelResponseBody(response);
    throw new HttpStatusError(response.status);
  }

  return (await readResponseBuffer(response, MAX_RESPONSE_BYTES)).toString('utf8');
};

export const fetchHttpJson = async (input: string | URL, options: HttpRequestOptions): Promise<unknown> =>
  JSON.parse(await fetchHttpText(input, options));
