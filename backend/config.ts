import { z } from 'zod';

const ConfigSchema = z.object({
  ARBITER_BACKEND_PORT: z.coerce.number().int().positive().default(4881),
  ARBITER_DB_PATH: z.string().default('data/arbiter.db'),
  ARBITER_SESSION_COOKIE: z.string().default('arbiter_session'),
  ARBITER_SESSION_SECRET: z.string().min(16).default('replace-this-local-secret'),
});

export type BackendConfig = z.infer<typeof ConfigSchema>;

export function getConfig(): BackendConfig {
  return ConfigSchema.parse(process.env);
}
