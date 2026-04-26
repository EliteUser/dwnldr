import type { ApiErrorCode } from './notify.utils';

export const FALLBACK_API_ERROR_MESSAGE = 'Something went wrong. Try again.';
export const REQUEST_FAILED_MESSAGE = 'The request failed. Try again.';

export const DOWNLOAD_NOTIFICATION_NAME = {
  cancelled: 'download-cancelled',
  metadataError: 'download-metadata-error',
  submitError: 'download-submit-error',
  missingBody: 'download-missing-body',
  networkError: 'download-network-error',
  success: 'download-success',
} as const;

export const DOWNLOAD_NOTIFICATION_MESSAGE = {
  cancelled: 'Download canceled.',
  success: (name: string) => `Track downloaded: ${name}`,
} as const;

export const FOLDER_NOTIFICATION_NAME = {
  syncStarted: 'folder-sync-started',
  syncSuccess: 'folder-sync-success',
  syncError: 'folder-sync-error',
  missingHandle: 'folder-missing-handle',
  permissionDenied: 'folder-permission-denied',
  apiUnsupported: 'folder-api-unsupported',
  pickerError: 'folder-picker-error',
} as const;

export const FOLDER_NOTIFICATION_MESSAGE = {
  fileSystemAccessError: 'Folder access is not available in this browser or connection.',
  missingHandle: 'Pick a folder in Settings before syncing.',
  permissionDenied: 'Folder permission was not granted. Pick the folder again in Settings.',
  syncStarted: (directoryName: string) => `Syncing ${directoryName}`,
  syncError: 'Could not sync the selected folder.',
  pickerError: 'Could not open the folder picker.',
  syncSuccess: (fileCount: number, directoryName: string) => `${fileCount} files found in ${directoryName}`,
} as const;

export const TRACK_META_NOTIFICATION_NAME = {
  cancelled: 'track-meta-cancelled',
  inspectError: 'track-meta-inspect-error',
  invalidAudio: 'track-meta-invalid-audio',
  submitError: 'track-meta-submit-error',
  missingBody: 'track-meta-missing-body',
  networkError: 'track-meta-network-error',
  success: 'track-meta-success',
} as const;

export const TRACK_META_NOTIFICATION_MESSAGE = {
  cancelled: 'Export canceled.',
  success: (name: string) => `Track exported: ${name}`,
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
