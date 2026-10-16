import { describe, expect, it, vi } from 'vitest';

import { ApiRequestError, parseApiErrorResponse, REQUEST_FAILED_MESSAGE } from './api.errors';

describe('API error helpers', () => {
  it('parses structured API error responses', async () => {
    const response = {
      json: vi.fn().mockResolvedValue({ code: 'UPSTREAM_FAILURE', error: 'Provider unavailable' }),
    } as unknown as Response;

    await expect(parseApiErrorResponse(response)).resolves.toEqual({
      code: 'UPSTREAM_FAILURE',
      error: 'Provider unavailable',
    });
  });

  it('uses status text or the request fallback when the response body is invalid', async () => {
    const badGateway = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      statusText: 'Bad Gateway',
    } as unknown as Response;
    const noStatusText = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      statusText: '',
    } as unknown as Response;

    await expect(parseApiErrorResponse(badGateway)).resolves.toEqual({
      code: 'INTERNAL_ERROR',
      error: 'Bad Gateway',
    });
    await expect(parseApiErrorResponse(noStatusText)).resolves.toEqual({
      code: 'INTERNAL_ERROR',
      error: REQUEST_FAILED_MESSAGE,
    });
  });

  it('retains structured response details on request errors', () => {
    const response = { code: 'INVALID_INPUT', error: 'Bad profile URL' };
    const error = new ApiRequestError(response, 400);

    expect(error).toMatchObject({
      message: 'Bad profile URL',
      name: 'ApiRequestError',
      response,
      status: 400,
    });
  });
});
