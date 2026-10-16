import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import { createYtDlp, ffmpegBinaryPath } from '../../lib/ytdlp.js';

type ReadinessCheck = {
  details?: string;
  ok: boolean;
};

export type ReadinessStatus = {
  checks: {
    ffmpeg: ReadinessCheck;
    server: ReadinessCheck;
    tempDir: ReadinessCheck;
    ytDlp: ReadinessCheck;
    ytDlpCache: ReadinessCheck;
  };
  status: 'error' | 'ok';
};

let shuttingDown = false;

const getCheckErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const checkBinaryPath = async (binaryPath: string | undefined, binaryName: string): Promise<ReadinessCheck> => {
  if (!binaryPath) {
    return {
      ok: false,
      details: `${binaryName} binary path is not configured.`,
    };
  }

  try {
    await fs.access(binaryPath);

    return {
      ok: true,
      details: binaryPath,
    };
  } catch (error) {
    return {
      ok: false,
      details: `${binaryName} binary is missing at ${binaryPath}: ${getCheckErrorDetails(error)}`,
    };
  }
};

const checkDirectoryWritable = async (directory: string, label: string): Promise<ReadinessCheck> => {
  try {
    await fs.mkdir(directory, { recursive: true });

    const probePath = path.join(directory, `.ready-${randomUUID()}.tmp`);

    await fs.writeFile(probePath, 'ready');
    await fs.unlink(probePath);

    return {
      ok: true,
      details: directory,
    };
  } catch (error) {
    return {
      ok: false,
      details: `${label} directory is not writable: ${getCheckErrorDetails(error)}`,
    };
  }
};

const checkYtDlpBinary = async (): Promise<ReadinessCheck> => {
  try {
    const ytdlp = createYtDlp();
    const installed = await ytdlp.checkInstallationAsync({
      ffmpeg: false,
    });

    if (!installed) {
      return {
        ok: false,
        details: 'yt-dlp is not available in the current runtime.',
      };
    }

    return {
      ok: true,
      details: ytdlp.binaryPath,
    };
  } catch (error) {
    return {
      ok: false,
      details: `yt-dlp availability check failed: ${getCheckErrorDetails(error)}`,
    };
  }
};

export const getHealthStatus = () => ({
  status: 'ok' as const,
  uptime: Math.floor(process.uptime()),
});

export const getReadinessStatus = async (): Promise<ReadinessStatus> => {
  const [ffmpeg, ytDlp, tempDir, ytDlpCache] = await Promise.all([
    checkBinaryPath(ffmpegBinaryPath, 'ffmpeg'),
    checkYtDlpBinary(),
    checkDirectoryWritable(env.TEMP_DIR, 'Temp'),
    checkDirectoryWritable(env.YT_DLP_CACHE_DIR, 'yt-dlp cache'),
  ]);

  const server: ReadinessCheck = shuttingDown
    ? {
        ok: false,
        details: 'Server is shutting down.',
      }
    : {
        ok: true,
      };

  const checks = {
    ffmpeg,
    server,
    tempDir,
    ytDlp,
    ytDlpCache,
  };

  return {
    status: Object.values(checks).every((check) => check.ok) ? 'ok' : 'error',
    checks,
  };
};

export const setServerShuttingDown = (value: boolean) => {
  shuttingDown = value;
};

export const resetHealthStateForTests = () => {
  shuttingDown = false;
};
