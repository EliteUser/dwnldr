import type { ApiErrorCode } from './notify.utils';

export const FALLBACK_API_ERROR_MESSAGE = 'Something went wrong on the server.';
export const REQUEST_FAILED_MESSAGE = 'Request failed';

export const DOWNLOAD_NOTIFICATION_NAME = {
  metadataError: 'download-metadata-error',
  submitError: 'download-submit-error',
  missingBody: 'download-missing-body',
  networkError: 'download-network-error',
  success: 'download-success',
} as const;

export const DOWNLOAD_NOTIFICATION_MESSAGE = {
  success: (name: string) => `Track downloaded: ${name}`,
} as const;

export const FOLDER_NOTIFICATION_NAME = {
  syncSuccess: 'folder-sync-success',
  syncError: 'folder-sync-error',
  apiUnsupported: 'folder-api-unsupported',
  pickerError: 'folder-picker-error',
} as const;

export const FOLDER_NOTIFICATION_MESSAGE = {
  fileSystemAccessError:
    'File system access requires a supported browser and a trusted secure context (HTTPS or localhost).',
  syncError: 'Failed to sync the selected folder.',
  pickerError: 'Failed to pick the music folder.',
  syncSuccess: (fileCount: number, directoryName: string) => `${fileCount} files found in ${directoryName}`,
} as const;

export const API_ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  INVALID_INPUT: 'Invalid request.',
  UNSUPPORTED_SOURCE: 'This URL is not supported. Use a SoundCloud or YouTube link.',
  YOUTUBE_PLAYLIST: 'Playlists are not supported - paste a link to a single video.',
  UPSTREAM_UNAUTHORIZED: 'SoundCloud rejected the request. Its client_id likely expired - restart the server.',
  UPSTREAM_FAILURE: 'SoundCloud / YouTube did not respond. Try again later.',
  CONVERSION_FAILURE: 'Audio conversion failed. The track may be in an unsupported format.',
  INTERNAL_ERROR: FALLBACK_API_ERROR_MESSAGE,
};
