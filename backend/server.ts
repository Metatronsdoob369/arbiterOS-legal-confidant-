import { createApp } from './app';
import { getConfig } from './config';

const config = getConfig();
const app = await createApp();

await app.listen({
  host: '127.0.0.1',
  port: config.ARBITER_BACKEND_PORT,
});
