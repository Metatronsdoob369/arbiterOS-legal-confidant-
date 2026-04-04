import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.OPENAI_API_KEY || ''),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || ''),
        'process.env.AI_BASE_URL': JSON.stringify(env.AI_BASE_URL || 'https://api.openai.com/v1'),
        'process.env.AI_MODEL': JSON.stringify(env.AI_MODEL || 'gpt-4o'),
        'process.env.AI_SHADOW_MODEL': JSON.stringify(env.AI_SHADOW_MODEL || ''),
        'process.env.AI_CRITIC_MODEL': JSON.stringify(env.AI_CRITIC_MODEL || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
