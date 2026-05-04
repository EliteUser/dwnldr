import { ApiRequestError } from '../../api/api.ts';
import { MAX_AUDIO_FILE_SIZE, SUPPORTED_AUDIO_EXTENSIONS, SUPPORTED_AUDIO_MIME_TYPES } from './track-meta.constants';
import type { TrackMetaMetadata } from './track-meta.types.ts';

export const getAudioValidationMessage = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const hasUnsupportedMimeType = Boolean(file.type) && !SUPPORTED_AUDIO_MIME_TYPES.has(file.type);

  if (!SUPPORTED_AUDIO_EXTENSIONS.has(extension) || hasUnsupportedMimeType) {
    return 'Use an MP3 audio file.';
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return 'Audio file must be 150 MB or smaller.';
  }

  return '';
};

export const inspectAudioFile = async (audio: File, signal: AbortSignal) => {
  const body = new FormData();

  body.set('audio', audio);

  const response = await fetch('/api/meta/inspect', {
    method: 'POST',
    body,
    signal,
  });

  if (!response.ok) {
    throw new ApiRequestError(await response.json(), response.status);
  }

  return (await response.json()) as TrackMetaMetadata;
};
