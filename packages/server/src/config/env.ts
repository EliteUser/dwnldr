import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).optional(),
  TEMP_DIR: z.string().default('./tmp/downloads'),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  LOG_LEVEL: parsedEnv.LOG_LEVEL ?? (parsedEnv.NODE_ENV === 'development' ? 'debug' : 'info'),
  TEMP_DIR: path.resolve(parsedEnv.TEMP_DIR),
};
