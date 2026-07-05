import argon2 from 'argon2';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
};

beforeEach(() => {
  process.env.ARBITER_DB_PATH = ':memory:';
  process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
  process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';
});

afterEach(() => {
  process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
  process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
  process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
});

function readSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!headerValue) {
    throw new Error('missing session cookie');
  }

  return headerValue.split(';')[0];
}

describe('legal backend routes', () => {
  it('returns retrieval health without exposing the frontend to direct Qdrant access', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/legal/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('status');
    expect(response.json()).toHaveProperty('collection');
  });

  it('routes legal queries through the backend boundary and records audit events', async () => {
    const app = await createApp();
    const passwordHash = await argon2.hash('secret-passphrase');

    (app as any).userRepository.insert({
      id: 'user-admin',
      username: 'admin',
      password_hash: passwordHash,
      role: 'admin',
      created_at: new Date().toISOString(),
      last_login_at: null,
      disabled_at: null,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret-passphrase' },
    });

    const sessionCookie = readSessionCookie(login.headers['set-cookie']);

    const queryResponse = await app.inject({
      method: 'POST',
      url: '/api/legal/query',
      cookies: { arbiter_session: sessionCookie.split('=')[1] },
      payload: { query: 'UCC 3-104' },
    });

    expect(queryResponse.statusCode).toBe(200);
    expect(queryResponse.json()).toMatchObject({
      found: false,
      source: 'backend-proxy:UCC 3-104',
    });

    const auditResponse = await app.inject({
      method: 'GET',
      url: '/api/audit-events',
      cookies: { arbiter_session: sessionCookie.split('=')[1] },
    });

    expect(auditResponse.statusCode).toBe(200);
    expect(auditResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          action: 'legal.query',
          domain: 'legal',
          resourceType: 'legal_query',
          details: expect.objectContaining({
            found: false,
            queryLength: 9,
            source: 'backend-proxy:UCC 3-104',
          }),
        }),
      ],
    });
  });
});
