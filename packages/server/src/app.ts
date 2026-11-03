import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes.js';

const clientDistPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 'loopback');
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          // Track lists show provider artwork directly; previews and Meta use blob: and data: URLs.
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          mediaSrc: ["'self'", 'blob:'],
          fontSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(requestLogger);
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(express.static(clientDistPath));
  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
};
