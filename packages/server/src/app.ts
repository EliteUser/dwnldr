import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/common/api.routes.js';
import type { HealthRouterOptions } from './routes/common/health.routes.js';
import { createHealthRouter } from './routes/common/health.routes.js';

const serverDirPath = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(serverDirPath, '../../client/dist');
type CreateAppOptions = {
  getReadiness?: HealthRouterOptions['getReadiness'];
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
  app.use(createHealthRouter({ getReadiness: options.getReadiness }));
  app.use(express.static(clientDistPath));

  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
};
