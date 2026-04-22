import { Router } from 'express';

import { soundcloudRouter } from '../soundcloud/index.js';
import { youtubeRouter } from '../youtube/index.js';
import { downloadRouter } from './download.routes.js';
import { favoritesRouter } from './favorites.routes.js';
import { usersRouter } from './users.routes.js';

export const apiRouter = Router();

apiRouter.use(usersRouter);
apiRouter.use(soundcloudRouter);
apiRouter.use(youtubeRouter);
apiRouter.use(favoritesRouter);
apiRouter.use(downloadRouter);
