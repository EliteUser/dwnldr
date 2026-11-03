import type { TrackTags } from '@dwnldr/shared';

import { readApiError } from '../../api';

const MAX_AUDIO_FILE_SIZE = 150 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'application/octet-stream']);
// ID3v2 tags sit at the start of the file, so inspecting does not need the whole upload.
const INSPECT_BYTES = 16 * 1024 * 1024;

export const getAudioValidationMessage = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension !== 'mp3' || (file.type && !AUDIO_MIME_TYPES.has(file.type))) {
    return 'Use an MP3 audio file.';
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return 'Audio file must be 150 MB or smaller.';
  }

  return '';
};

export const inspectAudioFile = async (audio: File, signal: AbortSignal) => {
  const body = new FormData();

  body.set('audio', audio.slice(0, INSPECT_BYTES, audio.type), audio.name);

  const response = await fetch('/api/meta/inspect', { method: 'POST', body, signal });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return (await response.json()) as TrackTags;
};
