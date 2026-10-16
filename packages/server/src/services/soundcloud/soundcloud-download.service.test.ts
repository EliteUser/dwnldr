import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createYtDlpMock,
  execMock,
  getTrackDetailsMock,
  postProcessTrackMock,
  resolveArtworkPathMock,
  saveThumbnailFromUrlMock,
} = vi.hoisted(() => ({
  createYtDlpMock: vi.fn(),
  execMock: vi.fn(),
  getTrackDetailsMock: vi.fn(),
  postProcessTrackMock: vi.fn(),
  resolveArtworkPathMock: vi.fn(),
  saveThumbnailFromUrlMock: vi.fn(),
}));

vi.mock('../../lib/ytdlp.js', () => ({
  createYtDlp: createYtDlpMock,
}));

vi.mock('../media/post-process.service.js', () => ({
  postProcessTrack: postProcessTrackMock,
}));

vi.mock('../media/thumbnail.service.js', () => ({
  saveThumbnailFromUrl: saveThumbnailFromUrlMock,
}));

vi.mock('../artwork/artwork.service.js', () => ({
  resolveArtworkPath: resolveArtworkPathMock,
}));

vi.mock('./soundcloud.service.js', () => ({
  getSoundCloudTrackDetails: getTrackDetailsMock,
}));

import { env } from '../../config/env.js';
import { downloadSoundCloudTrack } from './soundcloud-download.service.js';

const trackInfo = {
  artwork_url: 'https://i1.sndcdn.com/artworks-track-large.jpg',
  duration: 42000,
  id: 19,
  kind: 'track',
  permalink_url: 'https://soundcloud.com/artist/track',
  title: 'Track title',
  user: {
    avatar_url: 'https://i1.sndcdn.com/avatars-artist-large.jpg',
    username: 'Artist',
  },
};

describe('downloadSoundCloudTrack', () => {
  const folders: string[] = [];

  const createFolder = async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'dwnldr-sc-download-'));
    folders.push(folder);
    return folder;
  };

  beforeEach(() => {
    getTrackDetailsMock.mockResolvedValue(trackInfo);
    saveThumbnailFromUrlMock.mockImplementation(async (_url: string, outputPath: string) => outputPath);
    resolveArtworkPathMock.mockImplementation(async (artwork, folder: string, providerArtworkPath?: string) =>
      artwork ? path.join(folder, 'custom-artwork.png') : providerArtworkPath,
    );
    postProcessTrackMock.mockResolvedValue({ filePath: 'final.mp3' });
    execMock.mockImplementation((_url: string, options: { output: string }) => {
      const outputPath = options.output.replace('%(ext)s', 'webm');

      return {
        exec: async () => {
          await fs.writeFile(outputPath, 'audio');
          return {
            filePaths: [outputPath],
          };
        },
        kill: vi.fn(),
      };
    });
    createYtDlpMock.mockReturnValue({ exec: execMock });
  });

  afterEach(async () => {
    vi.clearAllMocks();

    await Promise.all(folders.splice(0).map((folder) => fs.rm(folder, { force: true, recursive: true })));
  });

  it('fetches metadata once and runs one deterministic yt-dlp audio job before shared post-processing', async () => {
    const folder = await createFolder();

    await expect(
      downloadSoundCloudTrack({
        folder,
        track: {
          url: 'http://www.soundcloud.com/artist/track?secret_token=abc',
        },
      }),
    ).resolves.toBe('final.mp3');

    expect(getTrackDetailsMock).toHaveBeenCalledTimes(1);
    expect(getTrackDetailsMock).toHaveBeenCalledWith(
      'https://www.soundcloud.com/artist/track?secret_token=abc',
      undefined,
    );
    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execMock).toHaveBeenCalledWith(
      'https://www.soundcloud.com/artist/track?secret_token=abc',
      expect.objectContaining({
        cacheDir: env.YT_DLP_CACHE_DIR,
        format: 'bestaudio/best',
        noPlaylist: true,
        output: path.join(folder, 'source.%(ext)s'),
      }),
    );
    expect(saveThumbnailFromUrlMock).toHaveBeenCalledWith(
      'https://i1.sndcdn.com/artworks-track-t500x500.jpg',
      path.join(folder, 'cover.png'),
      undefined,
    );
    expect(postProcessTrackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Artist - Track title',
        trackPath: path.join(folder, 'source.webm'),
      }),
    );
  });

  it('uses avatar artwork as fallback and gives custom artwork precedence', async () => {
    const folder = await createFolder();
    getTrackDetailsMock.mockResolvedValue({
      ...trackInfo,
      artwork_url: null,
    });

    await downloadSoundCloudTrack({
      folder,
      track: {
        artwork: {
          buffer: Buffer.from('custom'),
          mimeType: 'image/png',
          originalName: 'cover.png',
          size: 6,
        },
        url: 'https://soundcloud.com/artist/track',
      },
    });

    expect(saveThumbnailFromUrlMock).not.toHaveBeenCalled();
    expect(resolveArtworkPathMock).toHaveBeenCalledWith(expect.any(Object), folder, undefined);
    expect(postProcessTrackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        coverPath: path.join(folder, 'custom-artwork.png'),
      }),
    );
  });

  it('uses the artist avatar as a 500px cover when track artwork is unavailable', async () => {
    const folder = await createFolder();
    getTrackDetailsMock.mockResolvedValue({
      ...trackInfo,
      artwork_url: null,
    });

    await downloadSoundCloudTrack({
      folder,
      track: {
        url: 'https://soundcloud.com/artist/track',
      },
    });

    expect(saveThumbnailFromUrlMock).toHaveBeenCalledWith(
      'https://i1.sndcdn.com/avatars-artist-t500x500.jpg',
      path.join(folder, 'cover.png'),
      undefined,
    );
  });

  it('maps yt-dlp spawn errors to an internal server failure', async () => {
    const folder = await createFolder();
    execMock.mockReturnValue({
      exec: async () => {
        throw Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' });
      },
      kill: vi.fn(),
    });

    await expect(
      downloadSoundCloudTrack({
        folder,
        track: {
          url: 'https://soundcloud.com/artist/track',
        },
      }),
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  });

  it('kills and awaits the yt-dlp process after caller cancellation', async () => {
    const folder = await createFolder();
    const abortController = new AbortController();
    let finishProcess!: (result: { filePaths: string[] }) => void;
    const kill = vi.fn();
    execMock.mockReturnValue({
      exec: () =>
        new Promise((resolve) => {
          finishProcess = resolve;
        }),
      kill,
    });

    let operationSettled = false;
    const download = downloadSoundCloudTrack({
      folder,
      signal: abortController.signal,
      track: {
        url: 'https://soundcloud.com/artist/track',
      },
    }).finally(() => {
      operationSettled = true;
    });
    await vi.waitFor(() => expect(execMock).toHaveBeenCalledTimes(1));
    abortController.abort();
    await Promise.resolve();

    expect(kill).toHaveBeenCalledWith('SIGTERM');
    expect(operationSettled).toBe(false);
    finishProcess({ filePaths: [] });

    await expect(download).rejects.toMatchObject({ name: 'AbortError' });
    expect(operationSettled).toBe(true);
    expect(postProcessTrackMock).not.toHaveBeenCalled();
  });
});
