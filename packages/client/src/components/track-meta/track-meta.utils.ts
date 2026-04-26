import { MAX_AUDIO_FILE_SIZE, SUPPORTED_AUDIO_EXTENSIONS, SUPPORTED_AUDIO_MIME_TYPES } from './track-meta.constants';

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
