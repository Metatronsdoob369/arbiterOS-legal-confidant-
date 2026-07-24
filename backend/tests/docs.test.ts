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

describe('docs routes', () => {
  it('rejects unauthenticated department list', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/docs/departments' });
    expect(response.statusCode).toBe(401);
  });

  it('returns departments and IRS catalog for authenticated user', async () => {
    const app = await createApp();
    const token = await login(app);
    const departments = await app.inject({
      method: 'GET',
      url: '/api/docs/departments',
      cookies: { arbiter_session: token },
    });
    expect(departments.statusCode).toBe(200);
    const body = departments.json() as {
      departments: Array<{ department_id: string; status: string }>;
    };
    expect(body.departments.map((d) => d.department_id)).toEqual([
      'irs_treasury',
      'fred_fed',
      'ucc',
      'cfr',
    ]);

    const catalog = await app.inject({
      method: 'GET',
      url: '/api/docs/catalogs/irs_forms?q=8822&limit=5',
      cookies: { arbiter_session: token },
    });
    expect(catalog.statusCode).toBe(200);
    const catalogBody = catalog.json() as { total: number; entries: Array<{ entry_id: string }> };
    expect(catalogBody.total).toBeGreaterThan(0);
    expect(catalogBody.entries.some((e) => e.entry_id.includes('8822'))).toBe(true);
  });
});
