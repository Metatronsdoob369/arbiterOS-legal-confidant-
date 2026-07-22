import argon2 from 'argon2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
  LAW_CORPUS_URL: process.env.LAW_CORPUS_URL,
  WHITEGLOVE_URL: process.env.WHITEGLOVE_URL,
};

beforeEach(() => {
  process.env.ARBITER_DB_PATH = ':memory:';
  process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
  process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';
  process.env.LAW_CORPUS_URL = 'http://lawlibra.local:4880';
  delete process.env.WHITEGLOVE_URL;
});

afterEach(() => {
  process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
  process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
  process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
  process.env.LAW_CORPUS_URL = originalEnv.LAW_CORPUS_URL;
  process.env.WHITEGLOVE_URL = originalEnv.WHITEGLOVE_URL;
  vi.unstubAllGlobals();
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
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      status: 'ok',
      service: 'LawLibra',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/legal/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('status');
    expect(response.json()).toHaveProperty('collection');
    expect(fetchMock).toHaveBeenCalledWith('http://lawlibra.local:4880/health', expect.any(Object));
  });

  it('routes legal queries to the mapped legal corpus and records audit events', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = input.toString();

      if (requestUrl.includes('/api/legal/query') || requestUrl.includes('/legal/query')) {
        return new Response(JSON.stringify({
          query: 'UCC 3-104',
          results: [
            {
              rank: 1,
              score: 0.9912,
              citation: 'Ala. Code § 7-3-104',
              title: 'Negotiable Instruments',
              source: 'whiteglove-manifold',
              path: 'Ala. Code § 7-3-104',
              spectral_band: 'settled',
              corpus_heat: 0.00123,
              drift: 0.0004,
              shard_id: 'Ala. Code § 7-3-104',
              confidence: 'high',
              text: 'An instrument is negotiable if it is an unconditional promise or order to pay a fixed amount of money.',
            },
          ],
          meta: {
            total_returned: 1,
            collection: 'legal-heatmap',
            embed_model: 'temporal-manifold',
            vector_dims: 3072,
            latency_ms: 14,
          },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`unexpected fetch: ${requestUrl}`);
    });

    vi.stubGlobal('fetch', fetchMock);

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
      found: true,
      title: 'Negotiable Instruments',
      citation: 'Ala. Code § 7-3-104',
      source: 'whiteglove-manifold',
      silence: expect.objectContaining({
        contract_version: '1.0',
        authority_kind: 'statute',
        silenced: false,
        found: true,
      }),
    });
    expect(fetchMock).toHaveBeenCalledWith('http://lawlibra.local:4880/api/legal/query', expect.any(Object));

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
            found: true,
            queryLength: 9,
            source: 'whiteglove-manifold',
          }),
        }),
      ],
    });
  });
});
