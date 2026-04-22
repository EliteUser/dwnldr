import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const downloadTrackMock = vi.fn();
const scheduleDownloadCleanupMock = vi.fn();

vi.mock('./services/download.service.js', () => ({
  downloadTrack: downloadTrackMock,
  scheduleDownloadCleanup: scheduleDownloadCleanupMock,
}));

const { createApp } = await import('./app.js');

describe('download route cleanup', () => {
  let downloadFolder = '';
  let filePath = '';

  beforeEach(async () => {
    downloadFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-download-'));
    filePath = path.join(downloadFolder, 'track.mp3');

    await fs.writeFile(filePath, 'track-data');

    downloadTrackMock.mockResolvedValue({
      downloadFolder,
      fileName: 'track.mp3',
      filePath,
      fileSize: 10,
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await fs.rm(downloadFolder, { recursive: true, force: true });
  });

  it('schedules cleanup exactly once for a completed download', async () => {
    const response = await request(createApp()).post('/api/download').send({
      url: 'https://www.youtube.com/watch?v=test',
    });

    expect(response.status).toBe(200);

    await new Promise((resolve) => setImmediate(resolve));

    expect(scheduleDownloadCleanupMock).toHaveBeenCalledTimes(1);
    expect(scheduleDownloadCleanupMock).toHaveBeenCalledWith(downloadFolder);
  });
});
