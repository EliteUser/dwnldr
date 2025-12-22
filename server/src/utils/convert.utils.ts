import fs from 'node:fs/promises';
import ffmpegPath from 'ffmpeg-static';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { renameFile } from './common.utils';

const runFfmpeg = async (args: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath!, args, {
            stdio: ['ignore', 'ignore', 'pipe'],
        });

        let stderr = '';

        ffmpeg.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        ffmpeg.on('error', reject);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg failed (${code}): ${stderr}`));
            }
        });
    });
};

const normalizeMp4 = async (input: string): Promise<string> => {
    const fixed = input + '.fixed.m4a';

    await runFfmpeg([
        '-y',
        '-fflags',
        '+genpts',
        '-i',
        input,
        '-map_metadata',
        '0',
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        fixed,
    ]);

    return fixed;
};

export const convertToMp3 = async (inputPath: string): Promise<string> => {
    try {
        const parsed = path.parse(inputPath);

        /* Already MP3 → nothing to do */
        if (parsed.ext.toLowerCase() === '.mp3') {
            return inputPath;
        }

        const outputPath = path.join(parsed.dir, `${parsed.name}.mp3`);
        const tempPath = path.join(parsed.dir, `${parsed.name}.tmp.mp3`);

        let source = inputPath;

        try {
            await runFfmpeg([
                '-y',
                '-i',
                source,
                '-vn',
                '-map_metadata',
                '0',
                '-c:a',
                'libmp3lame',
                '-q:a',
                '0',
                '-ar',
                '48000',
                tempPath,
            ]);
        } catch {
            // Normalize container, then retry
            source = await normalizeMp4(inputPath);

            await runFfmpeg([
                '-y',
                '-i',
                source,
                '-vn',
                '-map_metadata',
                '0',
                '-c:a',
                'libmp3lame',
                '-q:a',
                '0',
                '-ar',
                '48000',
                tempPath,
            ]);

            await fs.unlink(source);
        }

        await fs.unlink(inputPath);
        await renameFile(tempPath, outputPath);

        return outputPath;
    } catch (err) {
        console.error('Failed to convert to mp3: ', err);
        return inputPath;
    }
};
