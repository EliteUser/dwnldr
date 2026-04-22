import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/api.routes.js';

const serverDirPath = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(serverDirPath, '../../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
    }),
  );
  app.use(express.json());
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
