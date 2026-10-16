import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).optional(),
  TEMP_DIR: z.string().default('./tmp/downloads'),
  DOWNLOAD_TIMEOUT_MS: z.coerce.number().int().positive().default(600000),
  YT_DLP_BINARY_PATH: z.string().min(1).optional(),
  YT_DLP_CACHE_DIR: z.string().min(1).optional(),
  YT_DLP_VERSION: z.string().min(1).optional(),
});

const parsedEnvResult = envSchema.safeParse(process.env);

if (!parsedEnvResult.success) {
  const issueList = parsedEnvResult.error.issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');

  process.stderr.write(`Invalid environment configuration: ${issueList}\n`);
  throw new Error(`Invalid environment configuration: ${issueList}`);
}

const parsedEnv = parsedEnvResult.data;

export const env = {
  ...parsedEnv,
  LOG_LEVEL: parsedEnv.LOG_LEVEL ?? (parsedEnv.NODE_ENV === 'development' ? 'debug' : 'info'),
  TEMP_DIR: path.resolve(parsedEnv.TEMP_DIR),
  YT_DLP_CACHE_DIR: path.resolve(parsedEnv.YT_DLP_CACHE_DIR ?? path.join(parsedEnv.TEMP_DIR, '..', 'yt-dlp-cache')),
};
