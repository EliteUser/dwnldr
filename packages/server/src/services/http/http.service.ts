import { cancelResponseBody, readResponseBuffer } from './response-buffer.service.js';

export class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`HTTP request failed with status ${status}${statusText ? ` ${statusText}` : ''}.`);
    this.name = 'HttpStatusError';
  }
}

export class HttpResponseParseError extends Error {
  constructor(message = 'HTTP response was not valid JSON.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpResponseParseError';
  }
}

export class HttpDeadlineExceededError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`HTTP operation exceeded its ${timeoutMs} ms deadline.`);
    this.name = 'HttpDeadlineExceededError';
  }
}

export type HttpRequestOptions = {
  headers?: Record<string, string>;
  maxResponseBytes?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export const createDeadlineSignal = (timeoutMs: number, parentSignal?: AbortSignal) => {
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort(new HttpDeadlineExceededError(timeoutMs));
  }, timeoutMs);

  timeout.unref();

  const onAbort = () => controller.abort(parentSignal?.reason);

  if (parentSignal?.aborted) {
    onAbort();
  } else {
    parentSignal?.addEventListener('abort', onAbort, { once: true });
  }

  return {
    dispose: () => {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', onAbort);
    },
    get didTimeout() {
      return didTimeout;
    },
    signal: controller.signal,
  };
};

export const fetchHttpText = async (input: string | URL, options: HttpRequestOptions = {}): Promise<string> => {
  const deadline = options.timeoutMs ? createDeadlineSignal(options.timeoutMs, options.signal) : undefined;
  const signal = deadline?.signal ?? options.signal;

  try {
    signal?.throwIfAborted();
    const response = await fetch(input, {
      headers: options.headers,
      redirect: 'error',
      signal,
    });

    if (!response.ok) {
      await cancelResponseBody(response);
      throw new HttpStatusError(response.status, response.statusText);
    }

    const body = await readResponseBuffer(response, options.maxResponseBytes ?? 10 * 1024 * 1024);
    return body.toString('utf8');
  } catch (error) {
    if (deadline?.didTimeout) {
      throw new HttpDeadlineExceededError(options.timeoutMs ?? 0);
    }

    throw error;
  } finally {
    deadline?.dispose();
  }
};

export const fetchHttpJson = async <T>(input: string | URL, options: HttpRequestOptions = {}): Promise<T> => {
  const text = await fetchHttpText(input, options);

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new HttpResponseParseError(undefined, { cause: error });
  }
};
