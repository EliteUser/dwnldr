import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getErrorMessage, isEnospcError } from '../../errors/error-utils.js';
import { HttpError } from '../../errors/http-error.js';
import { getLogger, logTimedOperation } from '../../lib/logger.js';
import { renameFile } from '../../utils/common.utils.js';

const resolvedFfmpegPath = (ffmpegPath as unknown as string | null) ?? undefined;

const runFfmpeg = async (args: string[]): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    if (!resolvedFfmpegPath) {
      reject(new Error('FFmpeg binary is not available'));
      return;
    }

    const ffmpeg = spawn(resolvedFfmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';

    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg failed (${code}): ${stderr}`));
    });
  });
};

const normalizeMp4 = async (inputPath: string): Promise<string> => {
  const fixedPath = `${inputPath}.fixed.m4a`;

  await runFfmpeg([
    '-y',
    '-fflags',
    '+genpts',
    '-i',
    inputPath,
    '-map_metadata',
    '0',
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    fixedPath,
  ]);

  return fixedPath;
};

const getFfmpegParams = (sourcePath: string, outputPath: string) => [
  '-y',
  '-i',
  sourcePath,
  '-vn',
  '-map_metadata',
  '0',
  '-c:a',
  'libmp3lame',
  '-q:a',
  '0',
  '-ar',
  '48000',
  outputPath,
];

export const convertToMp3 = async (inputPath: string): Promise<string> => {
  const parsedPath = path.parse(inputPath);
  const logger = getLogger({
    inputPath,
  });

  if (parsedPath.ext.toLowerCase() === '.mp3') {
    return inputPath;
  }

  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.mp3`);
  const tempPath = path.join(parsedPath.dir, `${parsedPath.name}.tmp.mp3`);

  let sourcePath = inputPath;

  try {
    await logTimedOperation(
      {
        startEvt: 'download.conversion.started',
        successEvt: 'download.conversion.completed',
        failureEvt: 'ffmpeg.exit.nonzero',
        startMessage: 'Starting ffmpeg conversion',
        successMessage: 'Completed ffmpeg conversion',
        failureMessage: (error) => `ffmpeg exited with a non-zero status: ${getErrorMessage(error)}`,
        bindings: {
          sourcePath,
          outputPath,
        },
      },
      () => runFfmpeg(getFfmpegParams(sourcePath, tempPath)),
    );
  } catch (error) {
    try {
      sourcePath = await normalizeMp4(inputPath);
      await logTimedOperation(
        {
          startEvt: 'download.conversion.started',
          successEvt: 'download.conversion.completed',
          failureEvt: 'ffmpeg.exit.nonzero',
          startMessage: 'Retrying ffmpeg conversion with normalized mp4 input',
          successMessage: 'Completed ffmpeg conversion after mp4 normalization',
          failureMessage: (nestedError) => `ffmpeg exited with a non-zero status: ${getErrorMessage(nestedError)}`,
          bindings: {
            sourcePath,
            outputPath,
          },
        },
        () => runFfmpeg(getFfmpegParams(sourcePath, tempPath)),
      );
      await fs.unlink(sourcePath);
    } catch (nestedError) {
      const enospcError = isEnospcError(nestedError) ? nestedError : isEnospcError(error) ? error : null;

      if (enospcError) {
        logger.error(
          {
            evt: 'disk.enospc',
            ...(enospcError instanceof Error ? { err: enospcError } : { error: String(enospcError) }),
          },
          'Disk is full during conversion',
        );
      }

      throw new HttpError(500, 'Conversion failed', {
        code: 'CONVERSION_FAILURE',
      });
    }
  }

  try {
    await fs.unlink(inputPath);
    await renameFile(tempPath, outputPath);
  } catch (error) {
    if (isEnospcError(error)) {
      logger.error(
        {
          evt: 'disk.enospc',
          ...(error instanceof Error ? { err: error } : { error: String(error) }),
        },
        'Disk is full while finalizing conversion',
      );
    }

    throw new HttpError(500, 'Conversion failed', {
      code: 'CONVERSION_FAILURE',
    });
  }

  return outputPath;
};
