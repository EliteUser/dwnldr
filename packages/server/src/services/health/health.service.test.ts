import type * as FsPromises from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdirMock = vi.fn();
const writeFileMock = vi.fn();
const unlinkMock = vi.fn();
const accessMock = vi.fn();
const checkInstallationAsyncMock = vi.fn();

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof FsPromises>('node:fs/promises');

  return {
    ...actual,
    default: {
      ...actual.default,
      access: accessMock,
      mkdir: mkdirMock,
      unlink: unlinkMock,
      writeFile: writeFileMock,
    },
    access: accessMock,
    mkdir: mkdirMock,
    unlink: unlinkMock,
    writeFile: writeFileMock,
  };
});

vi.mock('../../lib/ytdlp.js', () => ({
  createYtDlp: () => ({
    binaryPath: '/usr/bin/yt-dlp',
    checkInstallationAsync: checkInstallationAsyncMock,
  }),
  ffmpegBinaryPath: '/usr/bin/ffmpeg',
}));

const { getReadinessStatus, resetHealthStateForTests, setServerShuttingDown } = await import('./health.service.js');

describe('getReadinessStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetHealthStateForTests();
    accessMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
    checkInstallationAsyncMock.mockResolvedValue(true);
  });

  it('returns ok when dependencies are available and the server is accepting traffic', async () => {
    await expect(getReadinessStatus()).resolves.toMatchObject({
      status: 'ok',
      checks: {
        ffmpeg: {
          ok: true,
        },
        server: {
          ok: true,
        },
        tempDir: {
          ok: true,
        },
        ytDlp: {
          ok: true,
          details: '/usr/bin/yt-dlp',
        },
        ytDlpCache: { ok: true },
      },
    });

    expect(checkInstallationAsyncMock).toHaveBeenCalledWith({
      ffmpeg: false,
    });
  });

  it('returns an error when yt-dlp is not runnable', async () => {
    checkInstallationAsyncMock.mockResolvedValue(false);

    await expect(getReadinessStatus()).resolves.toMatchObject({
      status: 'error',
      checks: {
        ytDlp: {
          ok: false,
          details: 'yt-dlp is not available in the current runtime.',
        },
      },
    });
  });

  it('returns an error when the engine cache is not writable', async () => {
    const { env } = await import('../../config/env.js');
    writeFileMock.mockImplementation(async (filePath: string) => {
      if (filePath.startsWith(env.YT_DLP_CACHE_DIR)) {
        throw new Error('Permission denied');
      }
    });

    await expect(getReadinessStatus()).resolves.toMatchObject({
      status: 'error',
      checks: {
        tempDir: { ok: true },
        ytDlpCache: { ok: false, details: 'yt-dlp cache directory is not writable: Permission denied' },
      },
    });
  });

  it('returns an error while the server is shutting down', async () => {
    setServerShuttingDown(true);

    await expect(getReadinessStatus()).resolves.toMatchObject({
      status: 'error',
      checks: {
        server: {
          ok: false,
          details: 'Server is shutting down.',
        },
      },
    });
  });
});
