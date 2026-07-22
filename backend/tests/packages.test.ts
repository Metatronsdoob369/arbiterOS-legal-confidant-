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
  if (!headerValue) throw new Error('missing session cookie');
  return headerValue.split(';')[0];
}

async function login(app: Awaited<ReturnType<typeof createApp>>) {
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
  return readSessionCookie(login.headers['set-cookie']).split('=')[1];
}

describe('packages routes', () => {
  it('rejects unauthenticated catalog access', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/packages' });
    expect(response.statusCode).toBe(401);
  });

  it('returns primer catalog for authenticated user', async () => {
    const app = await createApp();
    const token = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/packages',
      cookies: { arbiter_session: token },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { packages: Array<{ package_id: string }> };
    expect(body.packages.map((p) => p.package_id)).toContain('contract_navigation');
  });

  it('returns transition essentials for an authenticated user', async () => {
    const app = await createApp();
    const token = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/packages/transition_essentials',
      cookies: { arbiter_session: token },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { package_id: string };
    expect(body.package_id).toBe('transition_essentials');
  });

  it('returns 404 for unknown package id when authenticated', async () => {
    const app = await createApp();
    const token = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/packages/does_not_exist',
      cookies: { arbiter_session: token },
    });
    expect(response.statusCode).toBe(404);
  });
});
