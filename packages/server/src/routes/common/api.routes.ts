import { Router } from 'express';

import { soundcloudRouter } from '../soundcloud/index.js';
import { youtubeRouter } from '../youtube/index.js';
import { artworkRouter } from './artwork.routes.js';
import { downloadRouter } from './download.routes.js';
import { trackMetaRouter } from './track-meta.routes.js';
import { tracksRouter } from './tracks.routes.js';

export const apiRouter = Router();

apiRouter.use(soundcloudRouter);
apiRouter.use(youtubeRouter);
apiRouter.use(artworkRouter);
apiRouter.use(tracksRouter);
apiRouter.use(downloadRouter);
apiRouter.use(trackMetaRouter);
