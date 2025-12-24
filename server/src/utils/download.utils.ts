import path from 'node:path';
import type { Soundcloud } from 'soundcloud.ts';

import { getExtension, getId, renameFile } from './common.utils';
import { TrackOptions } from '../types';
import { updateTrackMeta } from './metadata.utils';
import { convertToMp3 } from './convert.utils';

type SoundCloudDownloadOptions = {
    api: Soundcloud;
    track: TrackOptions;
    folder: string;
};

export const downloadSoundCloudTrack = async (options: SoundCloudDownloadOptions) => {
    const { api, track, folder } = options;

    const { url, name, album, lyrics } = track;

    try {
        let [trackPath, coverPath] = await Promise.all([
            api.util.downloadTrack(url, folder, false),
            api.util.downloadSongCover(url, folder),
        ]);

        const trackExtension = getExtension(trackPath);

        if (trackExtension !== '.mp3') {
            trackPath = await convertToMp3(trackPath);
        }

        const trackInfo = await api.tracks.get(url);
        const trackName = (name ?? `${trackInfo.user.username} - ${trackInfo.title}`).trim();

        const newTrackPath = path.join(folder, `${trackName}.${getExtension(trackPath)}`);
        const newCoverPath = path.join(folder, `${trackName}.${getExtension(coverPath)}`);

        await Promise.all([renameFile(trackPath, newTrackPath), renameFile(coverPath, newCoverPath)]);

        await updateTrackMeta({
            folder,
            name: trackName,
            album: album?.trim(),
            lyrics: lyrics?.trim(),
        });

        return newTrackPath;
    } catch (err) {
        console.error('Error downloading track from soundcloud:', err);
        return '';
    }
};
