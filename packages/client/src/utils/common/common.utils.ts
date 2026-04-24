import type { FileData } from '../../types';

export const isAbortError = (error: unknown) => (error as { name?: string }).name === 'AbortError';

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

  if (index <= 0) {
    return {
      name: fileName,
      extension: '',
    };
  }

  return {
    name: fileName.slice(0, index),
    extension: fileName.slice(index + 1),
  };
};

export const getDuration = (milliseconds: number): string => {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

  return `${minutes}:${formattedSeconds}`;
};
