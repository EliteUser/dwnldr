import path from 'node:path';
import type { Soundcloud } from 'soundcloud.ts';

import { getExtension, getId, renameFile } from './common.utils';
import { TrackOptions } from '../types';
import { updateTrackMeta } from './metadata.utils';
import { convertToMp3 } from './convert.utils';

export const downloadTrack = async (api: Soundcloud, track: TrackOptions) => {
    const { url, name, album, lyrics } = track;

    try {
        const trackInfo = await api.tracks.get(url);

        const trackName = (name ?? `${trackInfo.user.username} - ${trackInfo.title}`).trim();

        const downloadFolder = `./track_${getId()}`;

        let [trackPath, coverPath] = await Promise.all([
            api.util.downloadTrack(url, downloadFolder),
            api.util.downloadSongCover(url, downloadFolder),
        ]);

        const trackExtension = getExtension(trackPath);

        if (trackExtension !== '.mp3') {
            trackPath = await convertToMp3(trackPath);
        }

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
