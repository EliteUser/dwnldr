import { Router } from 'express';

import { downloadRouter } from './download.routes.js';
import { favoritesRouter } from './favorites.routes.js';
import { soundcloudRouter } from './soundcloud.routes.js';
import { usersRouter } from './users.routes.js';
import { youtubeRouter } from './youtube.routes.js';

export const apiRouter = Router();

apiRouter.use(usersRouter);
apiRouter.use(soundcloudRouter);
apiRouter.use(youtubeRouter);
apiRouter.use(favoritesRouter);
apiRouter.use(downloadRouter);
