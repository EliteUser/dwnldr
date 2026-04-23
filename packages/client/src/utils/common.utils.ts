import { FileData } from '../types';

export type Source = 'youtube' | 'soundcloud';

export const getFileData = (fileName: string): FileData => {
  const regex = /^(.+)\.([a-z0-9]{2,5})$/i;

  const match = fileName.match(regex);

  if (match) {
    return {
      name: match[1],
      extension: match[2],
    };
  }

  const index = fileName.lastIndexOf('.');

  return {
    name: fileName.slice(0, index),
    extension: fileName.slice(index + 1),
  };
};

export const getDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

  return `${minutes}:${formattedSeconds}`;
};

export const classifySource = (url: string): Source | null => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      return 'youtube';
    }

    if (hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com')) {
      return 'soundcloud';
    }
  } catch {
    return null;
  }

  return null;
};
