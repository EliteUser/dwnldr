import { createApp } from './app.js';
import { env } from './config/env.js';
import { assertYtDlpAvailable } from './lib/ytdlp.js';

const start = async () => {
  await assertYtDlpAvailable();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`Server running at http://localhost:${env.PORT}`);
  });
};

void start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
