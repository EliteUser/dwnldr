import express from 'express';
import type * as FsPromises from 'node:fs/promises';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createDownloadFolderMock = vi.fn();
const removeFolderMock = vi.fn();
const downloadYoutubeTrackMock = vi.fn();
const downloadSoundCloudTrackMock = vi.fn();
const soundcloudMock = {};

vi.mock('../../utils/temp.utils.js', () => ({
  createDownloadFolder: createDownloadFolderMock,
  removeFolder: removeFolderMock,
}));

vi.mock('../youtube/youtube-download.service.js', () => ({
  downloadYoutubeTrack: downloadYoutubeTrackMock,
}));

vi.mock('../soundcloud/soundcloud-download.service.js', () => ({
  downloadSoundCloudTrack: downloadSoundCloudTrackMock,
}));

vi.mock('../../lib/soundcloud.js', () => ({
  soundcloud: soundcloudMock,
}));

const statMock = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof FsPromises>('node:fs/promises');

  return {
    ...actual,
    default: {
      ...actual.default,
      stat: statMock,
    },
    stat: statMock,
  };
});

const { downloadTrack, streamFileToResponse } = await import('./download.service.js');

describe('downloadTrack', () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    vi.clearAllMocks();
    createDownloadFolderMock.mockResolvedValue('/tmp/download-folder');
    removeFolderMock.mockReturnValue(true);
    statMock.mockResolvedValue({
      size: 128,
    });
  });

  it('does not create a temp folder for unsupported sources', async () => {
    await expect(downloadTrack({ url: 'https://example.com/audio' }, signal)).rejects.toMatchObject({
      code: 'UNSUPPORTED_SOURCE',
      statusCode: 400,
    });

    expect(createDownloadFolderMock).not.toHaveBeenCalled();
    expect(removeFolderMock).not.toHaveBeenCalled();
  });

  it('removes the temp folder when the provider download fails', async () => {
    downloadYoutubeTrackMock.mockRejectedValue(new Error('download failed'));

    await expect(downloadTrack({ url: 'https://www.youtube.com/watch?v=test' }, signal)).rejects.toThrow(
      'download failed',
    );

    expect(createDownloadFolderMock).toHaveBeenCalledTimes(1);
    expect(removeFolderMock).toHaveBeenCalledWith('/tmp/download-folder');
  });

  it('returns file metadata after a successful download', async () => {
    downloadYoutubeTrackMock.mockResolvedValue('/tmp/download-folder/track.mp3');

    await expect(downloadTrack({ url: 'https://www.youtube.com/watch?v=test' }, signal)).resolves.toEqual({
      downloadFolder: '/tmp/download-folder',
      filePath: '/tmp/download-folder/track.mp3',
      fileName: 'track.mp3',
      fileSize: 128,
    });

    expect(removeFolderMock).not.toHaveBeenCalled();
  });

  it('stops the provider and reports a timeout once the download deadline passes', async () => {
    const timeoutController = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutController.signal);
    downloadYoutubeTrackMock.mockImplementation(
      ({ signal: providerSignal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          providerSignal.addEventListener('abort', () => reject(providerSignal.reason));
        }),
    );

    const download = downloadTrack({ url: 'https://www.youtube.com/watch?v=test' }, signal);
    const assertion = expect(download).rejects.toMatchObject({ statusCode: 504 });

    await vi.waitFor(() => expect(downloadYoutubeTrackMock).toHaveBeenCalled());
    timeoutController.abort(new DOMException('Timed out', 'TimeoutError'));
    await assertion;
    expect(removeFolderMock).toHaveBeenCalledWith('/tmp/download-folder');
    timeoutSpy.mockRestore();
  });

  it('passes client disconnects through to the provider', async () => {
    const controller = new AbortController();
    downloadYoutubeTrackMock.mockImplementation(
      ({ signal: providerSignal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          providerSignal.addEventListener('abort', () => reject(providerSignal.reason));
        }),
    );

    const download = downloadTrack({ url: 'https://www.youtube.com/watch?v=test' }, controller.signal);
    await vi.waitFor(() => expect(downloadYoutubeTrackMock).toHaveBeenCalled());
    controller.abort(new DOMException('Client disconnected', 'AbortError'));

    await expect(download).rejects.toMatchObject({ name: 'AbortError' });
    expect(removeFolderMock).toHaveBeenCalledWith('/tmp/download-folder');
  });
});

describe('streamFileToResponse', () => {
  it('schedules cleanup exactly once for a completed download', async () => {
    vi.useFakeTimers();

    const downloadFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-stream-'));
    const filePath = path.join(downloadFolder, 'track.mp3');

    await fs.writeFile(filePath, 'track-data');

    const app = express();

    app.get('/download', (_req, res) => {
      streamFileToResponse(res, {
        downloadFolder,
        fileName: 'track.mp3',
        filePath,
        fileSize: 10,
      });
    });

    const response = await request(app).get('/download');

    expect(response.status).toBe(200);

    await vi.runAllTimersAsync();

    expect(removeFolderMock).toHaveBeenCalledTimes(1);
    expect(removeFolderMock).toHaveBeenCalledWith(downloadFolder);

    vi.useRealTimers();
    await fs.rm(downloadFolder, { recursive: true, force: true });
  });

  it('sets an RFC 5987 content disposition header for downloads', async () => {
    const downloadFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-stream-'));
    const filePath = path.join(downloadFolder, 'track.mp3');

    await fs.writeFile(filePath, 'track-data');

    const app = express();

    app.get('/download', (_req, res) => {
      streamFileToResponse(res, {
        downloadFolder,
        fileName: 'Björk "Live".mp3',
        filePath,
        fileSize: 10,
      });
    });

    const response = await request(app).get('/download');

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toBe(
      `attachment; filename="Bj_rk -Live-.mp3"; filename*=UTF-8''Bj%C3%B6rk%20%22Live%22.mp3`,
    );

    await fs.rm(downloadFolder, { recursive: true, force: true });
  });
});
