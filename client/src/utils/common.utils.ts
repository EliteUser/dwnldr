import { rankItem } from '@tanstack/match-sorter-utils';

export type FileData = {
    name: string;
    ext: string;
    size: number;
};

export const getFileData = (file: File): FileData => {
    const [name, ext] = file.name.split('.');

    return {
        name,
        ext,
        size: file.size,
    };
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

export const isTrackDownloaded = (files: FileData[], title: string) => {
    const ranks = files.map(({ name }) => {
        const rank = rankItem(name, title);

        return rank.passed;
    });

    return ranks.some((rank) => rank);
};
