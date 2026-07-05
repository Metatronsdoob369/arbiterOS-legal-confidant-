import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionRecord(userId: string) {
  const publicToken = createSessionToken();
  const now = new Date();

  return {
    publicToken,
    record: {
      id: randomUUID(),
      user_id: userId,
      token_hash: hashSessionToken(publicToken),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      revoked_at: null,
    },
  };
}
