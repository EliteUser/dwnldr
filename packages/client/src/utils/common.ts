import type { FileData } from '../store';

export const isAbortError = (error: unknown) => (error as { name?: unknown } | null)?.name === 'AbortError';

export const getFileData = (fileName: string): FileData => {
  const index = fileName.lastIndexOf('.');

  return index > 0
    ? { name: fileName.slice(0, index), extension: fileName.slice(index + 1) }
    : { name: fileName, extension: '' };
};

export const getDuration = (milliseconds: number) => {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);

  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

/** Routes remote images through the server so the canvas-based artwork editor can read them. */
export const getProxiedImageUrl = (url: string | null | undefined) => {
  if (!url) {
    return '';
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);

    if (['http:', 'https:'].includes(parsedUrl.protocol) && parsedUrl.origin !== window.location.origin) {
      return `/api/artwork?${new URLSearchParams({ url: parsedUrl.href })}`;
    }
  } catch {
    // Not a URL: leave it unchanged.
  }

  return url;
};

export const getDownloadFileName = (contentDisposition: string | null, fallbackName: string) => {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return fallbackName;
    }
  }

  return contentDisposition?.match(/filename="([^"]+)"/i)?.[1] ?? fallbackName;
};

export const saveBlob = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};
