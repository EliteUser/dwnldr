import type { ProviderInfo } from '@dwnldr/shared';
import type { RequestHandler, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { z } from 'zod';

import { env } from './config/env.js';
import { HttpError } from './errors.js';
import { getRequestSignal } from './lib/request-signal.js';
import { downloadAudio, getTrack, providers, requireProvider } from './providers/index.js';
import { MAX_ARTWORK_SIZE } from './services/artwork/artwork.constants.js';
import { assertArtworkFile } from './services/artwork/artwork.service.js';
import { fetchRemoteArtwork } from './services/artwork/remote-artwork.service.js';
import { finalizeTrack, readTags } from './services/track-pipeline.js';
import { createDownloadFolder, removeFolder } from './utils/temp.utils.js';

const MAX_AUDIO_SIZE = 150 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'application/octet-stream']);

const urlQuerySchema = z.object({ url: z.string().trim().url() });

const tagsSchema = z.object({
  album: z.string().trim().optional(),
  lyrics: z.string().trim().optional(),
  name: z.string().trim().min(1),
});

const downloadBodySchema = tagsSchema.extend({ url: z.string().trim().url() });

/** Gives the request its own temp folder; uploads land there and everything is removed afterwards. */
const useTempFolder: RequestHandler = async (_req, res, next) => {
  res.locals.folder = await createDownloadFolder();
  next();
};

const createUpload = (maxFileSize: number) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, _file, callback) => callback(null, req.res?.locals.folder),
      filename: (_req, file, callback) => callback(null, file.fieldname),
    }),
    limits: { fieldSize: 64 * 1024, fields: 5, files: 2, fileSize: maxFileSize },
  });

const artworkUpload = createUpload(MAX_ARTWORK_SIZE);
const audioUpload = createUpload(MAX_AUDIO_SIZE);

const sendFile = (res: Response, filePath: string) =>
  new Promise<void>((resolve, reject) => {
    res.download(filePath, path.basename(filePath), (error) => (error && !res.headersSent ? reject(error) : resolve()));
  });

const requireAudio = (file: Express.Multer.File | undefined) => {
  if (!file) {
    throw new HttpError(400, 'Audio file is required.', { code: 'INVALID_INPUT' });
  }

  if (path.extname(file.originalname).toLowerCase() !== '.mp3' || !AUDIO_MIME_TYPES.has(file.mimetype)) {
    throw new HttpError(400, 'Audio file must be an MP3.', { code: 'INVALID_INPUT' });
  }

  return file;
};

const unsupported = (message: string) => new HttpError(400, message, { code: 'UNSUPPORTED_SOURCE' });

export const apiRouter = Router();

apiRouter.get('/providers', (_req, res) => {
  res.json(providers.map(({ key, label }): ProviderInfo => ({ key, label })));
});

apiRouter.get('/tracks', async (req, res) => {
  const { url } = urlQuerySchema.parse(req.query);

  res.json(await getTrack(url, getRequestSignal(res)));
});

apiRouter.get('/profile', async (req, res) => {
  const { url } = urlQuerySchema.parse(req.query);
  const { getProfile, label } = requireProvider(url);

  if (!getProfile) {
    throw unsupported(`${label} profiles are not supported.`);
  }

  res.json(await getProfile(url, getRequestSignal(res)));
});

apiRouter.get('/likes', async (req, res) => {
  const { url } = urlQuerySchema.parse(req.query);
  const { getLikes, label } = requireProvider(url);

  if (!getLikes) {
    throw unsupported(`${label} likes are not supported.`);
  }

  res.json(await getLikes(url, getRequestSignal(res)));
});

apiRouter.post('/download', useTempFolder, artworkUpload.single('artwork'), async (req, res) => {
  const folder: string = res.locals.folder;
  const timeout = AbortSignal.timeout(env.DOWNLOAD_TIMEOUT_MS);

  try {
    const { url, ...tags } = downloadBodySchema.parse(req.body);

    if (req.file) {
      await assertArtworkFile(req.file);
    }

    const audio = await downloadAudio(url, folder, AbortSignal.any([getRequestSignal(res), timeout]));
    const filePath = await finalizeTrack({
      artworkPath: req.file?.path ?? audio.artworkPath,
      audioPath: audio.audioPath,
      folder,
      tags,
    });

    await sendFile(res, filePath);
  } catch (error) {
    if (timeout.aborted) {
      throw new HttpError(504, 'Download timed out before the file was ready.', { code: 'INTERNAL_ERROR' });
    }

    throw error;
  } finally {
    // Downloads settle only after yt-dlp exits, so nothing is still writing into the folder.
    await removeFolder(folder);
  }
});

apiRouter.post('/meta/inspect', useTempFolder, audioUpload.single('audio'), async (req, res) => {
  try {
    const audio = requireAudio(req.file);

    res.json(await readTags(audio.path, path.parse(audio.originalname).name));
  } finally {
    await removeFolder(res.locals.folder);
  }
});

apiRouter.post(
  '/meta/download',
  useTempFolder,
  audioUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'artwork', maxCount: 1 },
  ]),
  async (req, res) => {
    const folder: string = res.locals.folder;
    const files = req.files as Record<string, Express.Multer.File[] | undefined> | undefined;

    try {
      const tags = tagsSchema.parse(req.body);
      const audio = requireAudio(files?.audio?.[0]);
      const artwork = files?.artwork?.[0];

      if (artwork) {
        await assertArtworkFile(artwork);
      }

      await sendFile(res, await finalizeTrack({ artworkPath: artwork?.path, audioPath: audio.path, folder, tags }));
    } finally {
      await removeFolder(folder);
    }
  },
);

apiRouter.get('/artwork', async (req, res) => {
  const { url } = urlQuerySchema.parse(req.query);
  const artwork = await fetchRemoteArtwork(url);

  res.type(artwork.mimeType).set('Cache-Control', 'no-store').send(artwork.buffer);
});

apiRouter.use((_req, res) => {
  res.status(404).json({ error: 'API route not found.', code: 'NOT_FOUND' });
});
