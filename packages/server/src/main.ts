import fs from 'node:fs/promises';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { assertYtDlpAvailable, createYtDlp, ffmpegBinaryPath } from './lib/ytdlp.js';
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

const start = async () => {
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

  app.listen(env.PORT, () => {
    logger.info(
      {
        evt: 'server.started',
        port: env.PORT,
      },
      `Server running at http://localhost:${env.PORT}`,
    );
  });
};

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
