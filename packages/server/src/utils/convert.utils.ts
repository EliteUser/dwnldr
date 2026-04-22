import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { renameFile } from './common.utils.js';

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

  if (parsedPath.ext.toLowerCase() === '.mp3') {
    return inputPath;
  }

  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.mp3`);
  const tempPath = path.join(parsedPath.dir, `${parsedPath.name}.tmp.mp3`);

  let sourcePath = inputPath;

  try {
    await runFfmpeg(getFfmpegParams(sourcePath, tempPath));
  } catch {
    sourcePath = await normalizeMp4(inputPath);
    await runFfmpeg(getFfmpegParams(sourcePath, tempPath));
    await fs.unlink(sourcePath);
  }

  try {
    await fs.unlink(inputPath);
    await renameFile(tempPath, outputPath);
  } catch (error) {
    throw new Error('Failed to convert to mp3', { cause: error });
  }

  return outputPath;
};
