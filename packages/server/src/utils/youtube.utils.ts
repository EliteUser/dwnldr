import type { TrackOptions } from '../types.js';
import type { VideoInfo } from 'ytdlp-nodejs';

import ffmpegPath from 'ffmpeg-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { YtDlp } from 'ytdlp-nodejs';

import { getExtension, renameFile } from './common.utils.js';
import { updateTrackMeta } from './metadata.utils.js';

type YoutubeDownloadOptions = {
  folder: string;
  track: TrackOptions;
};

const cropToCenterSquare = async (buffer: Buffer): Promise<Buffer> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  const side = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - side) / 2);
  const top = Math.floor((metadata.height - side) / 2);

  return image
    .extract({
      left,
      top,
      width: side,
      height: side,
    })
    .toBuffer();
};

const resizeImage = async (buffer: Buffer, size: number = 512): Promise<Buffer> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || metadata.width < size) {
    return buffer;
  }

  return image
    .resize(size, size, {
      fit: 'fill',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
};

const getYoutubeThumbnail = async (url: string, folder: string): Promise<string> => {
  const ytdlp = new YtDlp();
  const info = await ytdlp.getInfoAsync(url);

  if (info._type !== 'video') {
    return '';
  }

  if (!info.thumbnail) {
    throw new Error('No thumbnail found for video');
  }

  const response = await fetch(info.thumbnail);

  if (!response.ok) {
    throw new Error('Failed to download thumbnail');
  }

  const originalBuffer = Buffer.from(await response.arrayBuffer());
  const squareBuffer = await cropToCenterSquare(originalBuffer);
  const finalImage = await resizeImage(squareBuffer);
  const outputPath = path.join(folder, 'cover.png');

  await sharp(finalImage).png().toFile(outputPath);

  return outputPath;
};

export const downloadYoutubeTrack = async (options: YoutubeDownloadOptions) => {
  const { folder, track } = options;
  const { url, name, album, lyrics } = track;

  try {
    const ytdlp = new YtDlp({
      ffmpegPath: (ffmpegPath as unknown as string | null) ?? undefined,
    });
    const installed = await ytdlp.checkInstallationAsync({ ffmpeg: true });

    if (!installed) {
      throw new Error(
        'yt-dlp or ffmpeg not available. Ensure ffmpeg-static is installed and the environment allows downloading binaries.',
      );
    }

    await fs.mkdir(folder, { recursive: true });

    const info = (await ytdlp.getInfoAsync(url)) as VideoInfo;
    const trackName = (name ?? info.title).trim();
    const trackPath = path.join(folder, `${trackName}.mp3`);

    const [, coverPath] = await Promise.all([
      ytdlp.execAsync(url, {
        jsRuntime: 'node',
        format: 'bestaudio/best',
        audioFormat: 'mp3',
        audioQuality: '0',
        extractAudio: true,
        embedMetadata: true,
        embedThumbnail: true,
        noPlaylist: true,
        output: trackPath,
      }),
      getYoutubeThumbnail(url, path.resolve(folder)),
    ]);

    const newCoverPath = path.join(folder, `${trackName}.${getExtension(coverPath)}`);

    await renameFile(coverPath, newCoverPath);
    await updateTrackMeta({
      folder,
      name: trackName,
      album: album?.trim(),
      lyrics: lyrics?.trim(),
    });

    return trackPath;
  } catch (error) {
    throw new Error(`Failed to download or convert to mp3: ${(error as Error).message}`);
  }
};
