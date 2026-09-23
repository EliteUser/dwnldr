import { describe, expect, it } from 'vitest';

import { getYtDlpVersion } from './ytdlp.js';

describe('getYtDlpVersion', () => {
  it('reads the version from the configured executable instead of the wrapper', async () => {
    expect(await getYtDlpVersion(process.execPath, '')).toBe(process.version);
  });

  it('rejects a binary whose version differs from the pinned version', async () => {
    await expect(getYtDlpVersion(process.execPath, 'unexpected-version')).rejects.toThrow('yt-dlp version mismatch');
  });

  it('reports a missing binary path clearly', async () => {
    await expect(getYtDlpVersion('missing-yt-dlp-binary', '')).rejects.toThrow(
      'Cannot run yt-dlp binary at missing-yt-dlp-binary',
    );
  });
});
