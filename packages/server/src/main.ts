import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { assertYtDlpAvailable, createYtDlp, ffmpegBinaryPath } from './lib/ytdlp.js';
import { setServerShuttingDown } from './services/health/health.service.js';
import { ensureTempRoot, sweepStaleDownloadFolders } from './utils/temp.utils.js';

const STALE_DOWNLOAD_MAX_AGE_MS = 30 * 60 * 1000;
const TEMP_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

const getDependencyVersion = async (dependencyName: string) => {
  const packageJsonPath = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  return packageJson.dependencies?.[dependencyName] ?? 'unknown';
};

type ShutdownHandlerOptions = {
  exit?: (code: number) => void;
  forceExitAfterMs?: number;
  server: Server;
  tempSweepInterval: NodeJS.Timeout;
};

export const createGracefulShutdownHandler = (options: ShutdownHandlerOptions) => {
  const { server, tempSweepInterval } = options;
  const exit = options.exit ?? process.exit;
  const forceExitAfterMs = options.forceExitAfterMs ?? 10_000;
  let shuttingDown = false;

  return (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    setServerShuttingDown(true);
    clearInterval(tempSweepInterval);

    logger.info(
      {
        evt: 'server.shutdown.started',
        signal,
      },
      'Starting graceful shutdown',
    );

    const forceExitTimer = setTimeout(() => {
      logger.error(
        {
          evt: 'server.shutdown.forced',
          forceExitAfterMs,
        },
        'Graceful shutdown timed out',
      );
      server.closeAllConnections?.();
      exit(1);
    }, forceExitAfterMs);

    forceExitTimer.unref();

    server.close((error) => {
      clearTimeout(forceExitTimer);

      if (error) {
        logger.error(
          {
            evt: 'server.shutdown.failed',
            err: error,
          },
          'Graceful shutdown failed',
        );
        exit(1);
        return;
      }

      logger.info(
        {
          evt: 'server.shutdown.completed',
        },
        'Graceful shutdown completed',
      );
      exit(0);
    });

    server.closeIdleConnections?.();
  };
};

export const start = async () => {
  const ytdlp = await assertYtDlpAvailable(createYtDlp());
  const ytDlpVersion = await ytdlp.getVersionAsync().catch(() => 'unknown');
  const soundCloudVersion = await getDependencyVersion('soundcloud.ts');
  await ensureTempRoot();
  const cleanedFolderCount = await sweepStaleDownloadFolders(STALE_DOWNLOAD_MAX_AGE_MS);

  logger.info(
    {
      evt: 'server.startup',
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
      tempDir: env.TEMP_DIR,
      ffmpegPath: ffmpegBinaryPath ?? 'missing',
      ytDlpVersion,
      soundCloudVersion,
      cleanedFolderCount,
    },
    'Loaded server configuration',
  );

  const app = createApp();
  const tempSweepInterval = setInterval(async () => {
    try {
      const removedCount = await sweepStaleDownloadFolders(STALE_DOWNLOAD_MAX_AGE_MS);

      logger.info(
        {
          evt: 'download.cleanup.sweep.completed',
          removedCount,
        },
        'Completed temp download sweep',
      );
    } catch (error) {
      logger.error(
        {
          evt: 'download.cleanup.sweep.failed',
          ...(error instanceof Error ? { err: error } : { error: String(error) }),
        },
        'Failed temp download sweep',
      );
    }
  }, TEMP_SWEEP_INTERVAL_MS);

  tempSweepInterval.unref();

  setServerShuttingDown(false);

  const server = await new Promise<Server>((resolve, reject) => {
    const nextServer = app.listen(env.PORT, () => {
      logger.info(
        {
          evt: 'server.started',
          port: env.PORT,
        },
        `Server running at http://localhost:${env.PORT}`,
      );
      resolve(nextServer);
    });

    nextServer.once('error', reject);
  });

  const shutdown = createGracefulShutdownHandler({
    server,
    tempSweepInterval,
  });

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return {
    app,
    port: (server.address() as AddressInfo | null)?.port ?? env.PORT,
    server,
  };
};

const isEntrypoint = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isEntrypoint) {
  void start().catch((error) => {
    logger.fatal(
      {
        evt: 'server.start.failed',
        ...(error instanceof Error ? { err: error } : { error: String(error) }),
      },
      'Failed to start server',
    );
    process.exit(1);
  });
}
