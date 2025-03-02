import type { Soundcloud } from 'soundcloud.ts';
import { getExtension, getId, renameFile } from './common.utils';

import { TrackOptions } from '../types';
import { updateTrackMeta } from './metadata.utils';
import path from 'node:path';

export const downloadTrack = async (api: Soundcloud, track: TrackOptions) => {
    const { url, name, album, lyrics } = track;

    try {
        const trackInfo = await api.tracks.get(url);

        const trackName = (name ?? `${trackInfo.user.username} - ${trackInfo.title}`).trim();

        const downloadFolder = `./track_${getId()}`;

        const [trackPath, coverPath] = await Promise.all([
            api.util.downloadTrack(url, downloadFolder),
            api.util.downloadSongCover(url, downloadFolder),
        ]);

        const newTrackPath = path.join(downloadFolder, `${trackName}.${getExtension(trackPath)}`);
        const newCoverPath = path.join(downloadFolder, `${trackName}.${getExtension(coverPath)}`);

        await Promise.all([renameFile(trackPath, newTrackPath), renameFile(coverPath, newCoverPath)]);

        await updateTrackMeta({
            folder: downloadFolder,
            name: trackName,
            album: album?.trim(),
            lyrics: lyrics?.trim(),
        });

        return { path: newTrackPath, folder: downloadFolder };
    } catch (err) {
        console.error('Error downloading track:', err);
        return {};
    }
};
