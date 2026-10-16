import { normalizeSoundCloudProfileUrl } from '../providers/soundcloud/profile-url.utils';
import type { FileData } from '../types';
import type { PersistedAppState } from './store.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeNullableString = (value: unknown, fallback: string | null) => {
  if (value === undefined) {
    return fallback;
  }

  return typeof value === 'string' ? value : null;
};

const sanitizeLastSyncAt = (value: unknown, fallback: string | null) => {
  const lastSyncAt = sanitizeNullableString(value, fallback);

  return lastSyncAt && Number.isFinite(Date.parse(lastSyncAt)) ? lastSyncAt : null;
};

const sanitizeFiles = (value: unknown, fallback: FileData[]): FileData[] => {
  const files = value === undefined ? fallback : Array.isArray(value) ? value : [];

  return files.flatMap((file) => {
    if (!isRecord(file) || typeof file.name !== 'string' || typeof file.extension !== 'string') {
      return [];
    }

    return [{ name: file.name, extension: file.extension }];
  });
};

const sanitizeProfileUrl = (value: unknown, fallback: string | null) => {
  if (value === undefined) {
    return fallback ? normalizeSoundCloudProfileUrl(fallback) : null;
  }

  return typeof value === 'string' ? normalizeSoundCloudProfileUrl(value) : null;
};

export const sanitizePersistedAppState = (
  persistedState: unknown,
  fallback: PersistedAppState,
  options: { clearProfileUrl?: boolean } = {},
): PersistedAppState => {
  const persisted = isRecord(persistedState) ? persistedState : null;

  return {
    directoryName: sanitizeNullableString(persisted?.directoryName, fallback.directoryName),
    files: sanitizeFiles(persisted?.files, fallback.files),
    lastSyncAt: sanitizeLastSyncAt(persisted?.lastSyncAt, fallback.lastSyncAt),
    profileUrl: options.clearProfileUrl ? null : sanitizeProfileUrl(persisted?.profileUrl, fallback.profileUrl),
  };
};
