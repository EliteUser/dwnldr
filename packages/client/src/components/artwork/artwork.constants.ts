import type { ArtworkSourceMode } from './artwork.types';

export const ACCEPTED_ARTWORK_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
export const ACCEPTED_ARTWORK_INPUT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
export const ACCEPTED_ARTWORK_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_ARTWORK_FILE_SIZE = 8 * 1024 * 1024;
export const MAX_ARTWORK_IMAGE_SIZE = 8000;
export const MIN_ARTWORK_IMAGE_SIZE = 128;

export const ARTWORK_SOURCE_OPTIONS = [
  { content: 'File', value: 'file' },
  { content: 'URL', value: 'url' },
] satisfies Array<{ content: string; value: ArtworkSourceMode }>;
