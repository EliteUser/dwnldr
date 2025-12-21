import fs from 'node:fs';
import path from 'node:path';
import NodeID3 from 'node-id3';
import type { TrackProcessOptions, TrackProps } from '../types';
import { DEFAULT_ALBUM_NAME, IMAGE_EXTENSIONS } from '../constants';
import { getId } from './common.utils';
import { SoundcloudTrack } from 'soundcloud.ts';

export const getTrackData = (track: SoundcloudTrack) => {
    const { id, user, title, artwork_url, permalink_url, duration } = track;

    return {
        id,
        user: user.username,
        title,
        artwork_url,
        permalink_url,
        duration,
    };
};

const getTrackTags = (options: TrackProps) => {
    const { name, album = DEFAULT_ALBUM_NAME, lyrics = '' } = options;

    const [artist, title] = name!.split(' - ');

    return {
        artist,
        performerInfo: getId(),
        title,
        album,
        unsynchronisedLyrics: {
            language: 'eng',
            text: lyrics,
        },
    };
};

const getImageTags = (name: string) => {
    for (const ext of IMAGE_EXTENSIONS) {
        const imagePath = name.replace('.mp3', ext);

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);

            return {
                image: {
                    mime: ext === '.png' ? 'image/png' : 'image/jpeg',
                    type: {
                        id: 0x03,
                        name: 'front cover',
                    },
                    description: 'Track Cover',
                    imageBuffer,
                },
            };
        }
    }

    return {};
};

export const updateTrackMeta = async (options: TrackProcessOptions) => {
    const { folder, name, album, lyrics } = options;

    try {
        const filePath = path.join('./', folder, `${name}.mp3`);

        const nameTags = getTrackTags({ name, album, lyrics });
        const imageTags = getImageTags(filePath);

        const tags = {
            ...nameTags,
            ...imageTags,
        };

        const trackTitle = `${tags.artist} - ${tags.title}`;

        return new Promise((resolve, reject) => {
            NodeID3.update(tags, filePath, (err: any) => {
                if (err) {
                    console.info(`Error processing ${trackTitle}`);
                    reject(err);
                } else {
                    console.info(`Processed: ${trackTitle}`);
                    resolve(filePath);
                }
            });
        });
    } catch (err) {
        console.error('Error updating track meta:', err);
    }
};
