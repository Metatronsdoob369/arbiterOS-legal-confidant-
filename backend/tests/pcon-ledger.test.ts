import argon2 from 'argon2';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { LEDGER_BELT_VERSION } from '../../schemas/hypothesisLedger';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
  PCON_LEDGER_PATH: process.env.PCON_LEDGER_PATH,
};

let dir: string;

beforeEach(() => {
  process.env.ARBITER_DB_PATH = ':memory:';
  process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
  process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcon-ledger-routes-'));
  process.env.PCON_LEDGER_PATH = path.join(dir, 'ledger.v1.json');
});

afterEach(() => {
  process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
  process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
  process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
  if (originalEnv.PCON_LEDGER_PATH === undefined) delete process.env.PCON_LEDGER_PATH;
  else process.env.PCON_LEDGER_PATH = originalEnv.PCON_LEDGER_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

function readSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!headerValue) throw new Error('missing session cookie');
  return headerValue.split(';')[0].split('=')[1];
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
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'admin', password: 'secret-passphrase' },
  });
  return readSessionCookie(response.headers['set-cookie']);
}

describe('pcon ledger routes', () => {
  it('reports health with belt version, seeding an empty install', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/pcon/ledger/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { ok: boolean; belt_version: string; hypothesis_count: number };
    expect(body.ok).toBe(true);
    expect(body.belt_version).toBe(LEDGER_BELT_VERSION);
    expect(typeof body.hypothesis_count).toBe('number');
  });

  it('rejects unauthenticated case creation', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/pcon/ledger/cases',
      payload: { title: 'Test Case', goal: 'Win it' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('creates a case, creates a hypothesis, attaches evidence, advances lane, queries, and exports', async () => {
    const app = await createApp();
    const cookie = await login(app);

    const caseRes = await app.inject({
      method: 'POST',
      url: '/api/pcon/ledger/cases',
      cookies: { arbiter_session: cookie },
      payload: { title: 'Test Case', goal: 'Win it' },
    });
    expect(caseRes.statusCode).toBe(200);
    const caseBody = caseRes.json() as { id: string };

    const hypoRes = await app.inject({
      method: 'POST',
      url: '/api/pcon/ledger/hypotheses',
      cookies: { arbiter_session: cookie },
      payload: {
        title: 'Working Premise A',
        claim: 'Claim text',
        lane: 'working_premise',
        disposition: 'open',
        confidence: 0.5,
        source: 'test-suite',
        case_id: caseBody.id,
      },
    });
    expect(hypoRes.statusCode).toBe(200);
    const hypothesis = hypoRes.json() as { id: string };

    const evidenceRes = await app.inject({
      method: 'POST',
      url: `/api/pcon/ledger/hypotheses/${hypothesis.id}/evidence`,
      cookies: { arbiter_session: cookie },
      payload: { type: 'statute', ref: 'Some Statute' },
    });
    expect(evidenceRes.statusCode).toBe(200);
    expect((evidenceRes.json() as { evidence_refs: unknown[] }).evidence_refs).toHaveLength(1);

    const advanceRes = await app.inject({
      method: 'POST',
      url: `/api/pcon/ledger/hypotheses/${hypothesis.id}/advance`,
      cookies: { arbiter_session: cookie },
      payload: { toLane: 'study' },
    });
    expect(advanceRes.statusCode).toBe(200);
    expect((advanceRes.json() as { lane: string }).lane).toBe('study');

    const queryRes = await app.inject({
      method: 'POST',
      url: '/api/pcon/ledger/query',
      cookies: { arbiter_session: cookie },
      payload: { mode: 'counsel', caseId: caseBody.id },
    });
    expect(queryRes.statusCode).toBe(200);
    const queryBody = queryRes.json() as { results: Array<{ id: string }> };
    expect(queryBody.results.map((h) => h.id)).toContain(hypothesis.id);

    const exportRes = await app.inject({
      method: 'GET',
      url: '/api/pcon/ledger/export',
      cookies: { arbiter_session: cookie },
    });
    expect(exportRes.statusCode).toBe(200);
    expect(exportRes.body).toContain('Working Premise A');
  });

  it('rejects invalid advance-lane payload with 400', async () => {
    const app = await createApp();
    const cookie = await login(app);
    const hypoRes = await app.inject({
      method: 'POST',
      url: '/api/pcon/ledger/hypotheses',
      cookies: { arbiter_session: cookie },
      payload: {
        title: 'Some Hypothesis',
        claim: 'Claim text',
        lane: 'working_premise',
        disposition: 'open',
        confidence: 0.5,
        source: 'test-suite',
      },
    });
    const hypothesis = hypoRes.json() as { id: string };

    const response = await app.inject({
      method: 'POST',
      url: `/api/pcon/ledger/hypotheses/${hypothesis.id}/advance`,
      cookies: { arbiter_session: cookie },
      payload: { toLane: 'not_a_real_lane' },
    });
    expect(response.statusCode).toBe(400);
  });
});
