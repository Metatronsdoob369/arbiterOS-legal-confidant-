import argon2 from 'argon2';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { __resetRegisterLexiconCacheForTests } from '../core/legal/registerLexicon';
import type { RegisterEntry, RegisterLexicon } from '../../schemas/legalSchemas';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
  REGISTER_LEXICON_PATH: process.env.REGISTER_LEXICON_PATH,
  REGISTER_PROPOSALS_DIR: process.env.REGISTER_PROPOSALS_DIR,
};

const seedEntry: RegisterEntry = {
  term_id: 'money',
  surface_forms: ['money'],
  matrix: 'money_credit',
  confusion_with: [],
  mirror_hint: 'Echo money usage.',
  procedural_triggers: [],
  senses: [
    {
      register: 'plain',
      epistemic: 'plain',
      definition: 'Cash.',
      authority_cite: 'plain usage',
      source_refs: [],
    },
  ],
};

function readSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!headerValue) {
    throw new Error('missing session cookie');
  }
  return headerValue.split(';')[0];
}

describe('register route authentication', () => {
  let workspaceRoot = '';

  beforeEach(() => {
    process.env.ARBITER_DB_PATH = ':memory:';
    process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
    process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';

    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arbiter-register-auth-'));
    const lexiconPath = path.join(workspaceRoot, 'lexicon.json');
    const proposalsDir = path.join(workspaceRoot, 'proposals');
    fs.mkdirSync(proposalsDir, { recursive: true });
    const lexicon: RegisterLexicon = {
      schema_version: '0.1.0',
      lexicon_id: 'test-confidant',
      version: '1.0.0',
      entries: [seedEntry],
    };
    fs.writeFileSync(lexiconPath, `${JSON.stringify(lexicon, null, 2)}\n`, 'utf8');
    process.env.REGISTER_LEXICON_PATH = lexiconPath;
    process.env.REGISTER_PROPOSALS_DIR = proposalsDir;
    __resetRegisterLexiconCacheForTests();
  });

  afterEach(() => {
    __resetRegisterLexiconCacheForTests();
    if (workspaceRoot) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
    process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
    process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
    process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
    process.env.REGISTER_LEXICON_PATH = originalEnv.REGISTER_LEXICON_PATH;
    process.env.REGISTER_PROPOSALS_DIR = originalEnv.REGISTER_PROPOSALS_DIR;
  });

  it('rejects unauthenticated merge of register proposals', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/register/proposals/prop_missing/merge',
    });

    expect(response.statusCode).toBe(401);
  });

  it('allows authenticated merge flow to reach proposal lookup', async () => {
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
      url: '/api/register/proposals/prop_missing/merge',
      cookies: { arbiter_session: sessionCookie.split('=')[1] },
    });

    expect(response.statusCode).toBe(404);
  });
});
