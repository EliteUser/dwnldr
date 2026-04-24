import type { HealthRouterOptions } from './routes/common/health.routes.js';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/common/api.routes.js';
import { createHealthRouter } from './routes/common/health.routes.js';

const serverDirPath = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(serverDirPath, '../../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

type CreateAppOptions = {
  getReadiness?: HealthRouterOptions['getReadiness'];
};

export const createApp = (options: CreateAppOptions = {}) => {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(requestLogger);
  app.use(express.json({ limit: '64kb' }));
  app.use(createHealthRouter({ getReadiness: options.getReadiness }));
  app.use(express.static(clientDistPath));

  app.use('/api', apiRouter);

  app.get(/^\/(?!api).*/, (_req, res, next) => {
    if (!fs.existsSync(clientIndexPath)) {
      next();
      return;
    }

    res.sendFile(clientIndexPath);
  });

  app.use(errorHandler);

  return app;
};
