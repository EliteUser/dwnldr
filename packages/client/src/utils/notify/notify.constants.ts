import type { ApiErrorCode } from './notify.utils';

export const FALLBACK_API_ERROR_MESSAGE = 'Something went wrong. Try again.';
export const REQUEST_FAILED_MESSAGE = 'The request failed. Try again.';

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
  syncStarted: 'folder-sync-started',
  syncSuccess: 'folder-sync-success',
  syncError: 'folder-sync-error',
  apiUnsupported: 'folder-api-unsupported',
  pickerError: 'folder-picker-error',
} as const;

export const FOLDER_NOTIFICATION_MESSAGE = {
  fileSystemAccessError: 'Folder access is not available in this browser or connection.',
  syncStarted: (directoryName: string) => `Syncing ${directoryName}`,
  syncError: 'Could not sync the selected folder.',
  pickerError: 'Could not open the folder picker.',
  syncSuccess: (fileCount: number, directoryName: string) => `${fileCount} files found in ${directoryName}`,
} as const;

export const API_ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  INVALID_INPUT: 'Check the entered value and try again.',
  UNSUPPORTED_SOURCE: 'This URL is not supported. Use a SoundCloud or YouTube link.',
  YOUTUBE_PLAYLIST: 'Playlists are not supported - paste a link to a single video.',
  UPSTREAM_UNAUTHORIZED: 'Could not access this source right now. Try again later.',
  UPSTREAM_FAILURE: 'Could not reach this source right now. Try again later.',
  CONVERSION_FAILURE: 'Could not prepare the audio file.',
  INTERNAL_ERROR: FALLBACK_API_ERROR_MESSAGE,
};
