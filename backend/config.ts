import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const ConfigSchema = z.object({
  ARBITER_BACKEND_PORT: z.coerce.number().int().positive().default(4881),
  ARBITER_DB_PATH: z.string().default('data/arbiter.db'),
  ARBITER_SESSION_COOKIE: z.string().default('arbiter_session'),
  ARBITER_SESSION_SECRET: z.string().min(16).default('replace-this-local-secret'),
  COMMON_LAW_QDRANT_URL: z.string().url().default('http://127.0.0.1:6333'),
  COMMON_LAW_COLLECTION: z.string().min(1).default('case-law-holdings'),
  COMMON_LAW_VECTOR_SIZE: z.coerce.number().int().positive().default(1024),
  COMMON_LAW_EMBED_ENDPOINT: z.string().url().default('http://127.0.0.1:4881/embed'),
  COMMON_LAW_AUTO_BOOTSTRAP: z.coerce.boolean().default(true),
});

export type BackendConfig = z.infer<typeof ConfigSchema>;

let hasLoadedEnvFiles = false;

function parseEnvFile(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }

  return parsed;
}

function loadLocalEnvFiles() {
  if (hasLoadedEnvFiles) {
    return;
  }
  hasLoadedEnvFiles = true;

  const cwd = process.cwd();
  for (const filename of ['.env', '.env.local']) {
    const fullPath = path.join(cwd, filename);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(fullPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

export function getConfig(): BackendConfig {
  loadLocalEnvFiles();

  return ConfigSchema.parse({
    ...process.env,
    COMMON_LAW_QDRANT_URL:
      process.env.COMMON_LAW_QDRANT_URL
      ?? process.env.VITE_QDRANT_URL
      ?? 'http://127.0.0.1:6333',
    COMMON_LAW_COLLECTION:
      process.env.COMMON_LAW_COLLECTION
      ?? process.env.VITE_COMMON_LAW_COLLECTION
      ?? 'case-law-holdings',
    COMMON_LAW_VECTOR_SIZE:
      process.env.COMMON_LAW_VECTOR_SIZE
      ?? '1024',
    COMMON_LAW_EMBED_ENDPOINT:
      process.env.COMMON_LAW_EMBED_ENDPOINT
      ?? process.env.VITE_EMBED_ENDPOINT
      ?? 'http://127.0.0.1:4881/embed',
    COMMON_LAW_AUTO_BOOTSTRAP:
      process.env.COMMON_LAW_AUTO_BOOTSTRAP
      ?? 'true',
  });
}
