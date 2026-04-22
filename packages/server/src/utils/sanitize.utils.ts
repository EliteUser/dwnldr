const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]+/g;
const RESERVED_WINDOWS_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

const trimTrailingWindowsChars = (value: string) => value.replace(/[. ]+$/g, '');

export const sanitizeFilename = (name: string): string => {
  const trimmedName = name.trim();
  const safeName = trimTrailingWindowsChars(trimmedName.replace(INVALID_FILENAME_CHARS, '-')).slice(0, 200).trim();

  if (!safeName || /^-+$/.test(safeName)) {
    return 'track';
  }

  if (RESERVED_WINDOWS_NAME.test(safeName)) {
    return `track-${safeName}`.slice(0, 200);
  }

  return safeName;
};

export const getContentDispositionHeader = (fileName: string): string => {
  const asciiFallback = sanitizeFilename(fileName).replace(/[^\x20-\x7E]/g, '_');
  const escapedFallback = asciiFallback.replace(/(["\\])/g, '\\$1');
  const encodedFileName = encodeURIComponent(fileName)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A');

  return `attachment; filename="${escapedFallback}"; filename*=UTF-8''${encodedFileName}`;
};
