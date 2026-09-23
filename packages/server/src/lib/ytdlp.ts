import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { YtDlp } from 'ytdlp-nodejs';

import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

export const ffmpegBinaryPath = (ffmpegPath as unknown as string | null) ?? undefined;

export const createYtDlp = () =>
  new YtDlp({
    binaryPath: env.YT_DLP_BINARY_PATH,
    ffmpegPath: ffmpegBinaryPath,
  });

export const getYtDlpVersion = async (binaryPath: string, expectedVersion = env.YT_DLP_VERSION) => {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(binaryPath, ['--version'], { timeout: 10_000 }));
  } catch (error) {
    throw new Error(`Cannot run yt-dlp binary at ${binaryPath}`, { cause: error });
  }
  const version = stdout.trim();

  if (!version) {
    throw new Error(`yt-dlp returned an empty version from ${binaryPath}`);
  }

  if (expectedVersion && version !== expectedVersion) {
    throw new Error(`yt-dlp version mismatch: expected ${expectedVersion}, got ${version}`);
  }

  return version;
};

export const assertYtDlpAvailable = async (ytdlp: YtDlp = createYtDlp()) => {
  const installed = await ytdlp.checkInstallationAsync({ ffmpeg: true });

  if (!installed) {
    throw new Error('yt-dlp or ffmpeg is not available. Ensure the runtime includes both binaries.');
  }

  return ytdlp;
};
