import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: {
    YT_DLP_CACHE_DIR: 'cache',
    YT_DLP_PATH: process.execPath,
  },
}));

const { YtDlpError, runProcess, runYtDlp } = await import('./ytdlp.js');

const runNode = (script: string, signal = new AbortController().signal) =>
  runProcess(process.execPath, ['-e', script], signal);

describe('runProcess', () => {
  it('resolves with stdout of a successful process', async () => {
    await expect(runNode('process.stdout.write("done")')).resolves.toBe('done');
  });

  it('rejects with a URL-free stderr tail when the process fails', async () => {
    const error = await runNode(
      'console.error("ERROR: https://soundcloud.com/a/b?secret_token=s-123 failed"); process.exit(2)',
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(YtDlpError);
    expect(error).toMatchObject({ exitCode: 2, stderrTail: 'ERROR: <url> failed' });
  });

  it('kills the process on abort and settles only after it exits', async () => {
    const controller = new AbortController();
    const run = runNode('setInterval(() => {}, 1000)', controller.signal);

    controller.abort(new DOMException('Cancelled', 'AbortError'));

    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('also stops helper processes that inherited the pipes', async () => {
    const controller = new AbortController();
    const run = runNode(
      `require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' });
       setInterval(() => {}, 1000);
       process.stdout.write('started');`,
      controller.signal,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.abort(new DOMException('Cancelled', 'AbortError'));

    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('runYtDlp', () => {
  it('rejects a second process while one is still running', async () => {
    const first = runYtDlp([], 'https://example.com', new AbortController().signal);

    await expect(runYtDlp([], 'https://example.com', new AbortController().signal)).rejects.toMatchObject({
      code: 'SERVER_BUSY',
      statusCode: 503,
    });
    // The fake binary is node, which rejects yt-dlp flags and exits non-zero.
    await expect(first).rejects.toBeInstanceOf(YtDlpError);
    await expect(runYtDlp([], 'https://example.com', new AbortController().signal)).rejects.toBeInstanceOf(YtDlpError);
  });
});
