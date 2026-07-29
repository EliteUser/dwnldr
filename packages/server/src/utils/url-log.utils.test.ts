import { describe, expect, it } from 'vitest';

import { getSafeUrlLogFields } from './url-log.utils.js';

describe('getSafeUrlLogFields', () => {
  it('excludes credentials, query values, and fragments from log fields', () => {
    const fields = getSafeUrlLogFields('https://username:password@example.com/image.jpg?token=secret#private-fragment');

    expect(fields).toEqual({
      remoteHost: 'example.com',
      remotePath: '/image.jpg',
      remoteProtocol: 'https:',
    });
    expect(JSON.stringify(fields)).not.toMatch(/username|password|secret|private-fragment/);
  });

  it('marks malformed URLs without logging their contents', () => {
    const fields = getSafeUrlLogFields('not-a-url?token=secret');

    expect(fields).toEqual({ remoteUrlValid: false });
    expect(JSON.stringify(fields)).not.toContain('secret');
  });
});
