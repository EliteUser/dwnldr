import type { TrackTags } from '@dwnldr/shared';

import { readApiError } from '../../api';

const MAX_AUDIO_FILE_SIZE = 150 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'application/octet-stream']);
const ID3_HEADER_SIZE = 10;

/**
 * Length of the ID3v2 tag at the start of an MP3, read from its header (a "syncsafe" size: 7 bits per byte),
 * or 0 when the file has none. Inspecting only needs these bytes, not the whole audio.
 */
export const getId3TagLength = async (file: Blob) => {
  const header = new Uint8Array(await file.slice(0, ID3_HEADER_SIZE).arrayBuffer());

  if (header.length < ID3_HEADER_SIZE || String.fromCharCode(header[0], header[1], header[2]) !== 'ID3') {
    return 0;
  }

  const size = (header[6] << 21) | (header[7] << 14) | (header[8] << 7) | header[9];
  const hasFooter = (header[5] & 0x10) !== 0;

  return ID3_HEADER_SIZE + size + (hasFooter ? ID3_HEADER_SIZE : 0);
};

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

  body.set('audio', audio.slice(0, Math.max(await getId3TagLength(audio), ID3_HEADER_SIZE), audio.type), audio.name);

  const response = await fetch('/api/meta/inspect', { method: 'POST', body, signal });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return (await response.json()) as TrackTags;
};
