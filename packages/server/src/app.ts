import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes.js';
import type { ReadinessStatus } from './services/health/health.service.js';
import { getHealthStatus, getReadinessStatus } from './services/health/health.service.js';

const serverDirPath = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(serverDirPath, '../../client/dist');
type CreateAppOptions = {
  getReadiness?: () => Promise<ReadinessStatus>;
};

export const createApp = (options: CreateAppOptions = {}) => {
  const app = express();

  app.set('trust proxy', 'loopback');

  if (env.NODE_ENV !== 'production') {
    app.use(
      cors({
        origin: env.CORS_ORIGIN,
      }),
    );
  }
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      referrerPolicy: false,
      strictTransportSecurity: false,
      xContentTypeOptions: false,
    }),
  );
  app.use(requestLogger);
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => {
    res.json(getHealthStatus());
  });
  app.get('/ready', async (_req, res) => {
    const readiness = await (options.getReadiness ?? getReadinessStatus)();

    res.status(readiness.status === 'ok' ? 200 : 503).json(readiness);
  });
  app.use(express.static(clientDistPath));

  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
};
