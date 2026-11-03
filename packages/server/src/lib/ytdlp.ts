import { type ChildProcess, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

import { env } from '../config/env.js';
import { HttpError } from '../errors.js';

const execFileAsync = promisify(execFile);

const FORCE_KILL_DELAY_MS = 1_000;
const STDERR_TAIL_LENGTH = 2_000;
// yt-dlp output may echo the requested URL, including SoundCloud secret_token parameters.
const URL_PATTERN = /https?:\/\/\S+/g;

export class YtDlpError extends Error {
  constructor(
    readonly exitCode: number | null,
    readonly stderrTail: string,
  ) {
    super(`yt-dlp exited with code ${exitCode}: ${stderrTail}`);
    this.name = 'YtDlpError';
  }
}

const isWindows = process.platform === 'win32';

// yt-dlp starts helpers (ffmpeg, and on Windows its own PyInstaller child) that inherit our pipes.
// Killing only the direct child would leave them running, so the whole process tree is stopped.
const killTree = (child: ChildProcess, signal: NodeJS.Signals) => {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).once('error', () => undefined);
  } else {
    try {
      process.kill(-child.pid, signal);
    } catch {
      // The process group has already exited.
    }
  }
};

export const runProcess = (command: string, args: string[], signal: AbortSignal) =>
  new Promise<string>((resolve, reject) => {
    signal.throwIfAborted();

    // On POSIX the child leads its own process group, so killTree can signal every helper at once.
    const child = spawn(command, args, { detached: !isWindows, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let forceKillTimeout: NodeJS.Timeout | undefined;

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(forceKillTimeout);
      signal.removeEventListener('abort', onAbort);
      callback();
    };

    const onAbort = () => {
      killTree(child, 'SIGTERM');
      forceKillTimeout = setTimeout(() => killTree(child, 'SIGKILL'), FORCE_KILL_DELAY_MS);
      forceKillTimeout.unref();
    };

    signal.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_LENGTH);
    });
    child.once('error', (error) => settle(() => reject(error)));
    // Settle only after the process exits so callers never clean up files it is still writing.
    child.once('close', (exitCode) =>
      settle(() => {
        if (signal.aborted) {
          reject(signal.reason);
        } else if (exitCode === 0) {
          resolve(stdout);
        } else {
          reject(new YtDlpError(exitCode, stderr.replace(URL_PATTERN, '<url>').trim()));
        }
      }),
    );
  });

let isRunning = false;

/**
 * Runs one yt-dlp process at a time; the slot is held until the process exits, even after cancellation.
 */
export const runYtDlp = async (args: string[], url: string, signal: AbortSignal) => {
  if (isRunning) {
    throw new HttpError(503, 'The server is busy processing another media operation. Try again shortly.', {
      code: 'SERVER_BUSY',
    });
  }

  isRunning = true;

  try {
    return await runProcess(
      env.YT_DLP_PATH,
      [
        '--ignore-config',
        '--no-progress',
        '--js-runtimes',
        'node',
        '--cache-dir',
        env.YT_DLP_CACHE_DIR,
        ...args,
        '--',
        url,
      ],
      signal,
    );
  } finally {
    isRunning = false;
  }
};

export const getYtDlpVersion = async () => {
  try {
    const { stdout } = await execFileAsync(env.YT_DLP_PATH, ['--version'], { timeout: 10_000 });

    return stdout.trim();
  } catch (error) {
    throw new Error(`Cannot run yt-dlp at "${env.YT_DLP_PATH}". Install it or set YT_DLP_PATH.`, { cause: error });
  }
};
