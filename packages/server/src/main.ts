import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.info(`Server running at http://localhost:${env.PORT}`);
});
