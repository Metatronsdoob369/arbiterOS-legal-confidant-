import argon2 from 'argon2';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arbiter-drafts-export-'));

vi.mock('../core/storage/artifacts', () => ({
  ensureUserArtifactDir(userId: string, domain: string) {
    const dir = path.join(artifactRoot, domain, userId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
  createArtifactPath(userId: string, domain: string, filename: string) {
    const dir = path.join(artifactRoot, domain, userId);
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, path.basename(filename));
  },
}));

vi.mock('../core/legal/formChecks', () => ({
  verifyNegotiability: vi.fn(async () => ({
    rule_id: 'UCC_3_104',
    passed: false,
    details: 'FAILED: Non-negotiable.',
    evidence_source: 'UCC 3-104',
    timestamp: new Date().toISOString(),
  })),
  consultStatuteCitation: vi.fn(async (query: string) => query),
}));

import { createApp } from '../app';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
};

function readSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!headerValue) {
    throw new Error('missing session cookie');
  }
  return headerValue.split(';')[0];
}

describe('drafts export authorization', () => {
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

  it('rejects inline export when client forges passed=true but validation fails', async () => {
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

    const response = await app.inject({
      method: 'POST',
      url: '/api/drafts/export',
      cookies: { arbiter_session: sessionCookie.split('=')[1] },
      payload: {
        format: 'docx',
        draft: {
          id: 'forged-draft',
          form: {
            form_type: 'promissory_note_ucc',
            amount: 15000,
            lender: 'Acme Capital',
            borrower: 'Jordan Doe',
          },
          markdown: '# forged',
          validation_steps: [],
          passed: true,
          provenance: { citations: [], holdings: [], source_refs: [] },
          created_at: new Date().toISOString(),
        },
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      message: expect.stringMatching(/validation did not pass/i),
    });
  });
});
