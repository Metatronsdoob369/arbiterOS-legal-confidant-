import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 4321,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:4881',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.OPENAI_API_KEY || ''),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || ''),
        'process.env.AI_BASE_URL': JSON.stringify(env.AI_BASE_URL || 'https://api.openai.com/v1'),
        'process.env.AI_MODEL': JSON.stringify(env.AI_MODEL || 'gpt-4o'),
        'process.env.AI_SHADOW_MODEL': JSON.stringify(env.AI_SHADOW_MODEL || ''),
        'process.env.AI_CRITIC_MODEL': JSON.stringify(env.AI_CRITIC_MODEL || ''),
        'process.env.WHITEGLOVE_URL': JSON.stringify(env.WHITEGLOVE_URL || 'http://localhost:4880'),
        'import.meta.env.VITE_WHITEGLOVE_URL': JSON.stringify(env.VITE_WHITEGLOVE_URL || env.WHITEGLOVE_URL || 'http://localhost:4880'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
