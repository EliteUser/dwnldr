import fs from 'node:fs/promises';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { getYtDlpVersion } from './lib/ytdlp.js';
import { removeLeftoverFolders } from './utils/temp.utils.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

try {
  const ytDlpVersion = await getYtDlpVersion();
  await fs.mkdir(env.YT_DLP_CACHE_DIR, { recursive: true });
  const removedFolderCount = await removeLeftoverFolders();

  const server = createApp().listen(env.PORT, env.HOST, () => {
    logger.info(
      { evt: 'server.started', host: env.HOST, port: env.PORT, ytDlpVersion, removedFolderCount },
      `Server running at http://${env.HOST}:${env.PORT}`,
    );
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ evt: 'server.shutdown', signal }, 'Shutting down');
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch (error) {
  logger.fatal({ evt: 'server.start.failed', err: error }, 'Failed to start server');
  process.exit(1);
}
