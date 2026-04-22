import fs from 'node:fs/promises';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { getLogger, logger } from './lib/logger.js';
import { assertYtDlpAvailable, createYtDlp, ffmpegBinaryPath } from './lib/ytdlp.js';

const getDependencyVersion = async (dependencyName: string) => {
  const packageJsonPath = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  return packageJson.dependencies?.[dependencyName] ?? 'unknown';
};

const start = async () => {
  const ytdlp = await assertYtDlpAvailable(createYtDlp());
  const ytDlpVersion = await ytdlp.getVersionAsync();
  const soundCloudVersion = await getDependencyVersion('soundcloud.ts');

  logger.info(
    {
      evt: 'server.startup',
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
      tempDir: process.cwd(),
      ffmpegPath: ffmpegBinaryPath ?? 'missing',
      ytDlpVersion,
      soundCloudVersion,
    },
    'Loaded server configuration',
  );

  const app = createApp();

  app.listen(env.PORT, () => {
    getLogger().info(
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
