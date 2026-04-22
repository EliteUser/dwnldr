import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renameFile } from './common.utils.js';

describe('renameFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates filesystem rename failures', async () => {
    const error = new Error('rename failed');

    vi.spyOn(fs.promises, 'rename').mockRejectedValue(error);

    await expect(renameFile('from.mp3', 'to.mp3')).rejects.toThrow(error);
  });
});
