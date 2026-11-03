import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

// Each test file gets its own temp root, so files running in parallel (or a dev server) never
// see or remove each other's download folders.
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dwnldr-test-'));

process.env.TEMP_DIR = path.join(tempRoot, 'downloads');

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
