import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import argon2 from 'argon2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arbiter-drafts-'));

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
    passed: true,
    details: 'PASSED: Instrument meets all UCC 3-104 requirements for negotiability.',
    evidence_source: 'UCC 3-104',
    timestamp: new Date().toISOString(),
  })),
  consultStatuteCitation: vi.fn(async (query: string) => query),
}));

import { createApp } from '../app';
import * as formChecks from '../core/legal/formChecks';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
  WHITEGLOVE_URL: process.env.WHITEGLOVE_URL,
};

beforeEach(() => {
  process.env.ARBITER_DB_PATH = ':memory:';
  process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
  process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';
  process.env.WHITEGLOVE_URL = 'http://lawlibra.local:4880';
  vi.mocked(formChecks.verifyNegotiability).mockResolvedValue({
    rule_id: 'UCC_3_104',
    passed: true,
    details: 'PASSED: Instrument meets all UCC 3-104 requirements for negotiability.',
    evidence_source: 'UCC 3-104',
    timestamp: new Date().toISOString(),
  });
});

afterEach(() => {
  process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
  process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
  process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
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

async function loginAsAdmin(app: Awaited<ReturnType<typeof createApp>>) {
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

  return readSessionCookie(login.headers['set-cookie']);
}

describe('drafts backend routes', () => {
  it('requires auth for form generation', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/drafts/forms',
      payload: {
        form_type: 'promissory_note_ucc',
        amount: 1000,
        lender: 'Lender',
        borrower: 'Borrower',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates a form draft and exports a Word document', async () => {
    const app = await createApp();
    const sessionCookie = await loginAsAdmin(app);

    const formResponse = await app.inject({
      method: 'POST',
      url: '/api/drafts/forms',
      headers: { cookie: sessionCookie },
      payload: {
        form_type: 'promissory_note_ucc',
        amount: 15000,
        lender: 'Acme Capital',
        borrower: 'Jordan Doe',
        state: 'Alabama',
      },
    });

    expect(formResponse.statusCode).toBe(200);
    const formBody = formResponse.json();
    expect(formBody.passed).toBe(true);
    expect(formBody.draft_id).toBeTruthy();
    expect(formBody.generated_content).toContain('PROMISSORY NOTE');

    const exportResponse = await app.inject({
      method: 'POST',
      url: '/api/drafts/export',
      headers: { cookie: sessionCookie },
      payload: {
        draft_id: formBody.draft_id,
        format: 'docx',
      },
    });

    expect(exportResponse.statusCode).toBe(200);
    const exportBody = exportResponse.json();
    expect(exportBody.mime_type).toContain('wordprocessingml');
    expect(exportBody.size_bytes).toBeGreaterThan(1000);
    expect(fs.existsSync(exportBody.artifact_path)).toBe(true);

    const files = (app as any).processedFileRepository.listByUserId('user-admin', 'legal');
    expect(files.some((file: { id: string }) => file.id === exportBody.processed_file_id)).toBe(true);

    const download = await app.inject({
      method: 'GET',
      url: `/api/drafts/${formBody.draft_id}/download`,
      headers: { cookie: sessionCookie },
    });

    expect(download.statusCode).toBe(200);
    expect(download.headers['content-type']).toContain('wordprocessingml');
    expect(download.rawPayload.byteLength).toBeGreaterThan(1000);
  });

  it('blocks export when validation fails', async () => {
    vi.mocked(formChecks.verifyNegotiability).mockResolvedValue({
      rule_id: 'UCC_3_104',
      passed: false,
      details: 'FAILED: Non-negotiable.',
      evidence_source: 'UCC 3-104',
      timestamp: new Date().toISOString(),
    });

    const app = await createApp();
    const sessionCookie = await loginAsAdmin(app);

    const formResponse = await app.inject({
      method: 'POST',
      url: '/api/drafts/forms',
      headers: { cookie: sessionCookie },
      payload: {
        form_type: 'promissory_note_ucc',
        amount: 15000,
        lender: 'Acme Capital',
        borrower: 'Jordan Doe',
      },
    });

    expect(formResponse.statusCode).toBe(200);
    expect(formResponse.json().passed).toBe(false);

    const exportResponse = await app.inject({
      method: 'POST',
      url: '/api/drafts/export',
      headers: { cookie: sessionCookie },
      payload: {
        draft_id: formResponse.json().draft_id,
        format: 'docx',
      },
    });

    expect(exportResponse.statusCode).toBe(409);
    expect(exportResponse.json().message).toMatch(/validation did not pass/i);
  });

  it('rejects invalid form payloads', async () => {
    const app = await createApp();
    const sessionCookie = await loginAsAdmin(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/drafts/forms',
      headers: { cookie: sessionCookie },
      payload: {
        form_type: 'promissory_note_ucc',
        amount: 1000,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
