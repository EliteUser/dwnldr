import { FileData } from '../types';

import { CmpStr } from 'cmpstr';

const COMPARE_THRESHOLD = 0.8;

const stringCompare = CmpStr.create({
    metric: 'dice',
    flags: 'i',
});

export const getFileData = (fileName: string): FileData => {
    const regex = /^(.+)\.([a-z0-9]{2,5})$/i;

    const match = fileName.match(regex);

    if (match) {
        return {
            name: match[1],
            extension: match[2],
        };
    } else {
        const index = fileName.lastIndexOf('.');

        return {
            name: fileName.slice(0, index),
            extension: fileName.slice(index + 1),
        };
    }
};

export const getDuration = (milliseconds: number): string => {
    /* Convert milliseconds to total seconds */
    const totalSeconds = Math.floor(milliseconds / 1000);

    /* Calculate minutes and remaining seconds */
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    /* Add leading zero to seconds if less than 10 */
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    return `${minutes}:${formattedSeconds}`;
};

export const normalizeTrackName = (input: string) => {
    return (
        input
            .toLowerCase()

            /* Remove anything in parentheses */
            .replace(/\([^)]*\)/g, '')

            /* Remove featuring info */
            .replace(/\b(feat\.?|featuring|ft\.?)\b.*$/g, '')

            /* Remove remix / version words */
            .replace(/\b(remix|edit|version|mix|extended|original|bootleg|rework|vip)\b/g, '')

            /* Remove download noise */
            .replace(/\b(free\s*download|download|dl|mp3|wav|flac|320kbps|hq)\b/g, '')

            /* Remove extra punctuation */
            .replace(/[^a-z0-9]+/g, '')

            /* Collapse spaces */
            .replace(/\s+/g, ' ')

            .trim()
    );
};

export const isTrackDownloaded = (files: FileData[], title: string) => {
    const normalizedFiles = files.map(({ name }) => {
        return normalizeTrackName(name);
    });

    const result = stringCompare.batchSorted(normalizedFiles, normalizeTrackName(title)) as Array<{ match: number }>;

    return result[0].match >= COMPARE_THRESHOLD;

    // return ranks.some((rank) => rank);
    //
    // const ranks = files.map(({ name }) => {
    //     const result = stringCompare.test(normalizeTrackName(name), normalizeTrackName(title)) as { match: number };
    //
    //     return result.match >= COMPARE_THRESHOLD;
    // });
    //
    // return ranks.some((rank) => rank);
};
