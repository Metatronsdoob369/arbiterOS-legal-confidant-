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

describe('memory routes', () => {
  it('creates and lists user-scoped memory entries', async () => {
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

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/memories',
      cookies: { arbiter_session: sessionCookie.split('=')[1] },
      payload: {
        entryType: 'note',
        title: 'UCC leverage',
        content: 'Use Article 9 attachment analysis first.',
        source: 'operator',
        citation: '',
        tags: ['ucc', 'attachment'],
        pinned: true,
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/memories',
      cookies: { arbiter_session: sessionCookie.split('=')[1] },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      items: [
        {
          id: expect.any(String),
          type: 'note',
          title: 'UCC leverage',
          content: 'Use Article 9 attachment analysis first.',
          source: 'operator',
          citation: null,
          tags: ['ucc', 'attachment'],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          pinned: true,
        },
      ],
    });
  });
});
