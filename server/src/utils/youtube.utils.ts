import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { YtDlp } from 'ytdlp-nodejs';

import { TrackOptions } from '../types';
import { getExtension, renameFile } from './common.utils';
import { updateTrackMeta } from './metadata.utils';

type YoutubeDownloadOptions = {
    folder: string;
    track: TrackOptions;
};

/* region Thumbnail Preprocessing */
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
/* endregion Thumbnail Preprocessing */

const getYoutubeThumbnail = async (url: string, folder: string): Promise<string> => {
    const ytdlp = new YtDlp();

    const info = await ytdlp.getInfoAsync(url);

    if (info._type !== 'video') {
        return '';
    }

    if (!info || !info.thumbnail) {
        throw new Error('No thumbnail found for video');
    }

    const res = await fetch(info.thumbnail);
    if (!res.ok) {
        throw new Error('Failed to download thumbnail');
    }

    const originalBuffer = Buffer.from(await res.arrayBuffer());

    const square = await cropToCenterSquare(originalBuffer);
    const finalImage = await resizeImage(square);

    const outputPath = path.join(folder, 'cover.png');

    await sharp(finalImage).png().toFile(outputPath);

    return outputPath;
};

export const downloadYoutubeTrack = async (options: YoutubeDownloadOptions) => {
    const { track, folder } = options;

    const { url, name, album, lyrics } = track;

    try {
        const ytdlp = new YtDlp({
            ffmpegPath: ffmpegPath!,
        });

        const installed = await ytdlp.checkInstallationAsync({ ffmpeg: true });

        if (!installed) {
            throw new Error(
                'yt-dlp or ffmpeg not available. Ensure ffmpeg-static is installed and the environment allows downloading binaries.',
            );
        }

        await fs.mkdir(folder, { recursive: true });

        const info = await ytdlp.getInfoAsync(url);
        const trackName = (name ?? info.title).trim();

        const newTrackPath = path.join(folder, `${trackName}.mp3`);

        const [_, coverPath] = await Promise.all([
            ytdlp.execAsync(url, {
                additionalOptions: ['--js-runtimes', 'node'],
                ffmpegLocation: ffmpegPath!,
                format: 'bestaudio/best',
                audioFormat: 'mp3',
                audioQuality: '0',
                extractAudio: true,
                embedMetadata: true,
                embedThumbnail: true,
                noPlaylist: true,
                output: newTrackPath,
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

        return newTrackPath;
    } catch (err) {
        throw new Error(`Failed to download or convert to mp3: ${(err as Error).message}`);
    }
};

const url1 = 'https://www.youtube.com/watch?v=k1GeMaV3HUY';
const url2 = 'https://www.youtube.com/watch?v=h9qiORS3vCQ';
const url3 = 'https://youtu.be/k1GeMaV3HUY?si=2BOSpoqhED55TrVA';
