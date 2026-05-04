import NodeID3 from 'node-id3';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { HttpError } from '../../errors/http-error.js';
import { logTimedOperation } from '../../lib/logger.js';
import type { TrackProps } from '../../types.js';
import { sanitizeFilename } from '../../utils/sanitize.utils.js';
import { createDownloadFolder, removeFolder } from '../../utils/temp.utils.js';
import { resolveArtworkPath } from '../artwork/artwork.service.js';
import type { UploadedArtwork } from '../artwork/artwork.types.js';
import type { DownloadResult } from '../download/download.service.js';
import { updateTrackMeta } from '../metadata/metadata.service.js';

const MAX_AUDIO_SIZE = 150 * 1024 * 1024;
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3']);
const SUPPORTED_AUDIO_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'application/octet-stream']);

export type UploadedAudio = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  size: number;
};

export type TrackMetaMetadata = {
  album: string;
  artwork: {
    dataUrl: string;
    mimeType: string;
  } | null;
  lyrics: string;
  name: string;
};

type RewriteLocalTrackOptions = TrackProps & {
  audio: UploadedAudio;
};

const getAudioExtension = (originalName: string) => path.extname(originalName).toLowerCase();

const getOutputName = (name: string) => {
  const trimmedName = name.trim();

  const fileName = trimmedName.toLowerCase().endsWith('.mp3') ? trimmedName : `${trimmedName}.mp3`;

  return sanitizeFilename(fileName);
};

const assertUploadedAudio = (audio: UploadedAudio) => {
  const extension = getAudioExtension(audio.originalName);

  if (!SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    throw new HttpError(400, 'Audio file must be an MP3.', {
      code: 'INVALID_INPUT',
      details: {
        extension,
      },
    });
  }

  if (!SUPPORTED_AUDIO_MIME_TYPES.has(audio.mimeType)) {
    throw new HttpError(400, 'Audio file must be an MP3.', {
      code: 'INVALID_INPUT',
      details: {
        mimeType: audio.mimeType,
      },
    });
  }

  if (audio.size > MAX_AUDIO_SIZE) {
    throw new HttpError(400, 'Audio file must be 150 MB or smaller.', {
      code: 'INVALID_INPUT',
      details: {
        maxSize: MAX_AUDIO_SIZE,
      },
    });
  }
};

const getNameFromTags = (tags: NodeID3.Tags, fallbackName: string) => {
  const artist = tags.artist?.trim();
  const title = tags.title?.trim();

  if (artist && title) {
    return `${artist} - ${title}`;
  }

  return title || artist || fallbackName;
};

const getLyricsFromTags = (tags: NodeID3.Tags) => tags.unsynchronisedLyrics?.text?.trim() ?? '';

const getArtworkFromTags = (tags: NodeID3.Tags): TrackMetaMetadata['artwork'] => {
  if (!tags.image || typeof tags.image === 'string') {
    return null;
  }

  return {
    dataUrl: `data:${tags.image.mime};base64,${tags.image.imageBuffer.toString('base64')}`,
    mimeType: tags.image.mime,
  };
};

export const inspectLocalTrack = async (audio: UploadedAudio): Promise<TrackMetaMetadata> => {
  return await logTimedOperation(
    {
      startEvt: 'track_meta.inspect.started',
      successEvt: 'track_meta.inspect.completed',
      failureEvt: 'track_meta.inspect.failed',
      startMessage: 'Inspecting local audio metadata',
      successMessage: 'Inspected local audio metadata',
      failureMessage: 'Failed to inspect local audio metadata',
      failureLevel: 'warn',
      bindings: {
        mimeType: audio.mimeType,
        originalName: audio.originalName,
        size: audio.size,
      },
      getSuccessBindings: (metadata) => ({
        hasArtwork: Boolean(metadata.artwork),
        hasLyrics: Boolean(metadata.lyrics),
      }),
    },
    async () => {
      assertUploadedAudio(audio);

      let tags: NodeID3.Tags;

      try {
        tags = await NodeID3.Promise.read(audio.buffer);
      } catch {
        tags = {};
      }

      const fallbackName = path.basename(audio.originalName, getAudioExtension(audio.originalName));

      return {
        album: tags.album?.trim() ?? '',
        artwork: getArtworkFromTags(tags),
        lyrics: getLyricsFromTags(tags),
        name: getNameFromTags(tags, fallbackName),
      };
    },
  );
};

export const rewriteLocalTrack = async (options: RewriteLocalTrackOptions): Promise<DownloadResult> => {
  return await logTimedOperation(
    {
      startEvt: 'track_meta.rewrite.started',
      successEvt: 'track_meta.rewrite.completed',
      failureEvt: 'track_meta.rewrite.failed',
      startMessage: 'Rewriting local audio metadata',
      successMessage: 'Rewrote local audio metadata',
      failureMessage: 'Failed to rewrite local audio metadata',
      bindings: {
        hasCustomArtwork: Boolean(options.artwork),
        mimeType: options.audio.mimeType,
        originalName: options.audio.originalName,
        size: options.audio.size,
      },
      getSuccessBindings: (result) => ({
        downloadFolder: result.downloadFolder,
        fileName: result.fileName,
        fileSize: result.fileSize,
      }),
    },
    async () => {
      const { audio, artwork, name } = options;

      assertUploadedAudio(audio);

      const downloadFolder = await createDownloadFolder();
      const fileName = getOutputName(name || path.basename(audio.originalName, getAudioExtension(audio.originalName)));
      const filePath = path.join(downloadFolder, fileName);

      try {
        await fsPromises.writeFile(filePath, audio.buffer);

        const coverPath = await resolveArtworkPath(artwork as UploadedArtwork | undefined, downloadFolder);

        await updateTrackMeta({
          album: options.album,
          coverPath,
          filePath,
          lyrics: options.lyrics,
          name: name || path.basename(audio.originalName, getAudioExtension(audio.originalName)),
        });

        const stat = await fsPromises.stat(filePath);

        return {
          downloadFolder,
          fileName,
          filePath,
          fileSize: stat.size,
        };
      } catch (error) {
        removeFolder(downloadFolder);
        throw error;
      }
    },
  );
};
