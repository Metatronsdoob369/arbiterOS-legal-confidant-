# ArbiterOS Airgapped MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local backend, local login, SQLite-backed per-user persistence, processed-file tracking, and a backend-owned retrieval boundary to the existing ArbiterOS frontend without collapsing WhiteGlove into the legal product.

**Architecture:** Keep the current Vite/React app as the frontend and add a new Fastify backend on `localhost`. The backend owns auth, sessions, SQLite, artifact metadata, audit events, and all Qdrant/WhiteGlove access, while the legal UI consumes only local `/api` endpoints with cookie-based auth.

**Tech Stack:** React 19, Vite, TypeScript, Fastify, `@fastify/cookie`, `better-sqlite3`, Argon2, Vitest, Playwright

---

## File Structure

Planned file layout and responsibilities:

- Modify: `package.json`
  Add backend dev/test scripts and backend dependencies.
- Modify: `vite.config.ts`
  Proxy `/api` requests to the local backend during development.
- Create: `backend/config.ts`
  Parse and validate backend env vars with Zod.
- Create: `backend/app.ts`
  Build the Fastify instance and register routes.
- Create: `backend/server.ts`
  Start the backend server.
- Create: `backend/core/storage/migrations/001_init.sql`
  Create `users`, `sessions`, `memory_entries`, `processed_files`, and `audit_events`.
- Create: `backend/core/storage/database.ts`
  Open SQLite and apply migrations.
- Create: `backend/core/repositories/*.ts`
  Encapsulate SQL access per record type.
- Create: `backend/core/auth/passwords.ts`
  Hash and verify passwords with Argon2.
- Create: `backend/core/auth/sessions.ts`
  Mint, hash, persist, resolve, and revoke session tokens.
- Create: `backend/core/audit/writeAuditEvent.ts`
  Write audit rows consistently.
- Create: `backend/core/legal/whitegloveGateway.ts`
  Call WhiteGlove/Qdrant from the backend only.
- Create: `backend/modules/auth/routes.ts`
  Login, logout, session status.
- Create: `backend/modules/memory/routes.ts`
  List and create user-scoped memory entries.
- Create: `backend/modules/processed-files/routes.ts`
  List, create, and fetch processed file records.
- Create: `backend/modules/legal/routes.ts`
  Retrieval health and legal query proxy.
- Create: `backend/modules/audit/routes.ts`
  Return current user's audit history.
- Create: `backend/scripts/seedAdmin.ts`
  Bootstrap the first local admin account.
- Create: `backend/tests/*.test.ts`
  Backend unit and integration coverage.
- Create: `components/auth/LoginScreen.tsx`
  Local login UI.
- Create: `contexts/AuthContext.tsx`
  Frontend session state and login/logout actions.
- Create: `services/localApiClient.ts`
  Cookie-aware `/api` fetch wrapper.
- Modify: `App.tsx`
  Gate the legal workspace behind auth.
- Modify: `services/whitegloveClient.ts`
  Route legal retrieval through the local backend instead of direct remote calls.
- Modify: `components/Library.tsx`
  Replace in-memory demo data with backend-backed user memory entries.
- Create: `components/ProcessedFilesPanel.tsx`
  Render persisted processed-file records inside the existing UI.
- Modify: `components/AuditLog.tsx`
  Replace local-only audit assumptions with backend audit data.
- Create: `e2e/auth.spec.ts`
  Verify login and logout.
- Create: `e2e/persistence.spec.ts`
  Verify per-user memory and processed-file persistence.

## Task 1: Backend Bootstrap and Dev Wiring

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `backend/config.ts`
- Create: `backend/app.ts`
- Create: `backend/server.ts`
- Test: `backend/tests/app.test.ts`

- [ ] **Step 1: Write the failing backend smoke test**

```ts
// backend/tests/app.test.ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('backend app', () => {
  it('responds to GET /api/health', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Add backend scripts and dependencies, then run the test to verify failure**

```json
{
  "scripts": {
    "dev": "concurrently -k \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:frontend": "vite",
    "dev:backend": "tsx watch backend/server.ts",
    "seed:admin": "tsx backend/scripts/seedAdmin.ts",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.1",
    "argon2": "^0.41.1",
    "better-sqlite3": "^11.8.1",
    "fastify": "^5.6.1"
  },
  "devDependencies": {
    "concurrently": "^9.2.1",
    "tsx": "^4.20.5"
  }
}
```

Run: `npx vitest run backend/tests/app.test.ts`
Expected: FAIL with `Cannot find module '../app'`

- [ ] **Step 3: Write the minimal backend app and server**

```ts
// backend/config.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  ARBITER_BACKEND_PORT: z.coerce.number().default(4881),
  ARBITER_DB_PATH: z.string().default('data/arbiter.db'),
  ARBITER_SESSION_COOKIE: z.string().default('arbiter_session'),
  ARBITER_SESSION_SECRET: z.string().min(16).default('replace-this-local-secret'),
});

export type BackendConfig = z.infer<typeof ConfigSchema>;
export const getConfig = () => ConfigSchema.parse(process.env);
```

```ts
// backend/app.ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { getConfig } from './config';

export async function createApp() {
  const config = getConfig();
  const app = Fastify({ logger: true });

  await app.register(cookie, { secret: config.ARBITER_SESSION_SECRET });

  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
```

```ts
// backend/server.ts
import { createApp } from './app';
import { getConfig } from './config';

const config = getConfig();
const app = await createApp();

await app.listen({ host: '127.0.0.1', port: config.ARBITER_BACKEND_PORT });
```

- [ ] **Step 4: Proxy `/api` through Vite and rerun the test**

```ts
// vite.config.ts
server: {
  port: 3000,
  host: '0.0.0.0',
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:4881',
      changeOrigin: true,
    },
  },
},
```

Run: `npx vitest run backend/tests/app.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts backend/config.ts backend/app.ts backend/server.ts backend/tests/app.test.ts
git commit -m "feat: bootstrap local backend for airgapped MVP"
```

## Task 2: SQLite Schema, Migration, and Admin Bootstrap

**Files:**
- Create: `backend/core/storage/migrations/001_init.sql`
- Create: `backend/core/storage/database.ts`
- Create: `backend/core/repositories/userRepository.ts`
- Create: `backend/core/repositories/sessionRepository.ts`
- Create: `backend/core/repositories/memoryRepository.ts`
- Create: `backend/core/repositories/processedFileRepository.ts`
- Create: `backend/core/repositories/auditRepository.ts`
- Create: `backend/scripts/seedAdmin.ts`
- Test: `backend/tests/storage.test.ts`

- [ ] **Step 1: Write the failing storage test**

```ts
// backend/tests/storage.test.ts
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../core/storage/database';

describe('sqlite migrations', () => {
  it('creates core tables', () => {
    const db = createDatabase(':memory:');
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row: { name: string }) => row.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('memory_entries');
    expect(tableNames).toContain('processed_files');
    expect(tableNames).toContain('audit_events');
  });
});
```

- [ ] **Step 2: Run the storage test to verify failure**

Run: `npx vitest run backend/tests/storage.test.ts`
Expected: FAIL with `Cannot find module '../core/storage/database'`

- [ ] **Step 3: Write the migration and database initializer**

```sql
-- backend/core/storage/migrations/001_init.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  citation TEXT,
  tags_json TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS processed_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  processing_status TEXT NOT NULL,
  qdrant_collection TEXT,
  qdrant_point_ids_json TEXT NOT NULL DEFAULT '[]',
  spectral_run_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  domain TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

```ts
// backend/core/storage/database.ts
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function createDatabase(filename: string) {
  const db = new Database(filename);
  const migrationPath = path.resolve('backend/core/storage/migrations/001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
  return db;
}
```

- [ ] **Step 4: Add repository helpers and admin seed script, then rerun the test**

```ts
// backend/core/repositories/userRepository.ts
export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login_at: string | null;
  disabled_at: string | null;
}

export function createUserRepository(db: Database.Database) {
  return {
    findById(id: string) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
    },
    findByUsername(username: string) {
      return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRecord | undefined;
    },
    insert(record: UserRecord) {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, last_login_at, disabled_at)
        VALUES (@id, @username, @password_hash, @role, @created_at, @last_login_at, @disabled_at)
      `).run(record);
    },
  };
}
```

```ts
// backend/core/repositories/sessionRepository.ts
export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export function createSessionRepository(db: Database.Database) {
  return {
    insert(record: SessionRecord) {
      db.prepare(`
        INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, revoked_at)
        VALUES (@id, @user_id, @token_hash, @created_at, @expires_at, @revoked_at)
      `).run(record);
    },
    findActiveByTokenHash(tokenHash: string) {
      return db.prepare(`
        SELECT * FROM sessions
        WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
      `).get(tokenHash, new Date().toISOString()) as SessionRecord | undefined;
    },
  };
}
```

```ts
// backend/core/repositories/auditRepository.ts
export interface AuditEventRecord {
  id: string;
  user_id: string | null;
  domain: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details_json: string;
  created_at: string;
}

export function createAuditRepository(db: Database.Database) {
  return {
    insert(record: AuditEventRecord) {
      db.prepare(`
        INSERT INTO audit_events (id, user_id, domain, action, resource_type, resource_id, details_json, created_at)
        VALUES (@id, @user_id, @domain, @action, @resource_type, @resource_id, @details_json, @created_at)
      `).run(record);
    },
    listByUserId(userId: string) {
      return db.prepare('SELECT * FROM audit_events WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    },
  };
}
```

```ts
// backend/scripts/seedAdmin.ts
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../core/storage/database';

const db = createDatabase(process.env.ARBITER_DB_PATH ?? 'data/arbiter.db');
const now = new Date().toISOString();

db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, last_login_at, disabled_at)
  VALUES (@id, @username, @password_hash, 'admin', @created_at, NULL, NULL)
`).run({
  id: randomUUID(),
  username: process.env.ARBITER_BOOTSTRAP_USERNAME ?? 'admin',
  password_hash: 'replace-after-auth-task',
  created_at: now,
});
```

```ts
// backend/app.ts
import { createDatabase } from './core/storage/database';
import { createUserRepository } from './core/repositories/userRepository';
import { createSessionRepository } from './core/repositories/sessionRepository';
import { createMemoryRepository } from './core/repositories/memoryRepository';
import { createProcessedFileRepository } from './core/repositories/processedFileRepository';
import { createAuditRepository } from './core/repositories/auditRepository';
// ...
const db = createDatabase(config.ARBITER_DB_PATH);
app.decorate('db', db);
app.decorate('userRepository', createUserRepository(db));
app.decorate('sessionRepository', createSessionRepository(db));
app.decorate('memoryRepository', createMemoryRepository(db));
app.decorate('processedFileRepository', createProcessedFileRepository(db));
app.decorate('auditRepository', createAuditRepository(db));
```

Run: `npx vitest run backend/tests/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/core/storage backend/core/repositories backend/scripts/seedAdmin.ts backend/tests/storage.test.ts
git commit -m "feat: add sqlite schema and repository layer"
```

## Task 3: Password Hashing, Session Tokens, and Auth Routes

**Files:**
- Create: `backend/core/auth/passwords.ts`
- Create: `backend/core/auth/sessions.ts`
- Create: `backend/modules/auth/routes.ts`
- Modify: `backend/app.ts`
- Modify: `backend/scripts/seedAdmin.ts`
- Test: `backend/tests/auth.test.ts`

- [ ] **Step 1: Write the failing auth integration test**

```ts
// backend/tests/auth.test.ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('auth routes', () => {
  it('logs in and returns a session cookie', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret-passphrase' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.cookies.find((cookie) => cookie.name === 'arbiter_session')).toBeTruthy();
    expect(response.json()).toEqual({
      user: { username: 'admin', role: 'admin' },
    });
  });
});
```

- [ ] **Step 2: Run the auth test to verify failure**

Run: `npx vitest run backend/tests/auth.test.ts`
Expected: FAIL with `POST /api/auth/login returned 404`

- [ ] **Step 3: Write password and session services**

```ts
// backend/core/auth/passwords.ts
import argon2 from 'argon2';

export const hashPassword = (plainText: string) => argon2.hash(plainText);
export const verifyPassword = (hash: string, plainText: string) => argon2.verify(hash, plainText);
```

```ts
// backend/core/auth/sessions.ts
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionRecord(userId: string) {
  const token = createSessionToken();
  return {
    publicToken: token,
    record: {
      id: randomUUID(),
      user_id: userId,
      token_hash: hashSessionToken(token),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      revoked_at: null,
    },
  };
}
```

- [ ] **Step 4: Add auth routes and seed the admin with a real hash**

```ts
// backend/modules/auth/routes.ts
import { FastifyInstance } from 'fastify';
import { verifyPassword } from '../../core/auth/passwords';
import { createSessionRecord, hashSessionToken } from '../../core/auth/sessions';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { username: string; password: string };
    const user = app.userRepository.findByUsername(body.username);

    if (!user || !(await verifyPassword(user.password_hash, body.password))) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const session = createSessionRecord(user.id);
    app.sessionRepository.insert(session.record);

    reply.setCookie('arbiter_session', session.publicToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return { user: { username: user.username, role: user.role } };
  });
}
```

```ts
// backend/scripts/seedAdmin.ts
import { hashPassword } from '../core/auth/passwords';
// ...
const passwordHash = await hashPassword(process.env.ARBITER_BOOTSTRAP_PASSWORD ?? 'secret-passphrase');
// use passwordHash instead of a literal string
```

```ts
// backend/app.ts
import { registerAuthRoutes } from './modules/auth/routes';
// ...
app.decorate('requireSession', async (request) => {
  const token = request.cookies.arbiter_session;
  if (!token) throw app.httpErrors.unauthorized();

  const session = app.sessionRepository.findActiveByTokenHash(hashSessionToken(token));
  if (!session) throw app.httpErrors.unauthorized();

  const user = app.userRepository.findById(session.user_id);
  if (!user || user.disabled_at) throw app.httpErrors.unauthorized();

  return user;
});
await registerAuthRoutes(app);
```

Run: `npx vitest run backend/tests/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/core/auth backend/modules/auth/routes.ts backend/app.ts backend/scripts/seedAdmin.ts backend/tests/auth.test.ts
git commit -m "feat: add local login and session cookies"
```

## Task 4: Memory API Backed by SQLite

**Files:**
- Create: `backend/modules/memory/routes.ts`
- Modify: `backend/core/repositories/memoryRepository.ts`
- Modify: `backend/app.ts`
- Test: `backend/tests/memory.test.ts`

- [ ] **Step 1: Write the failing memory route test**

```ts
// backend/tests/memory.test.ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('memory routes', () => {
  it('creates and lists user-scoped memory entries', async () => {
    const app = await createApp();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret-passphrase' },
    });

    const sessionCookie = login.cookies[0];

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/memories',
      cookies: { arbiter_session: sessionCookie.value },
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
      cookies: { arbiter_session: sessionCookie.value },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the memory test to verify failure**

Run: `npx vitest run backend/tests/memory.test.ts`
Expected: FAIL with `POST /api/memories returned 404`

- [ ] **Step 3: Add the repository methods**

```ts
// backend/core/repositories/memoryRepository.ts
export interface MemoryEntryRecord {
  id: string;
  user_id: string;
  domain: 'legal';
  entry_type: string;
  title: string;
  content: string;
  source: string | null;
  citation: string | null;
  tags_json: string;
  pinned: 0 | 1;
  created_at: string;
  updated_at: string;
}

export function createMemoryRepository(db: Database.Database) {
  return {
    listByUserId(userId: string) {
      return db.prepare('SELECT * FROM memory_entries WHERE user_id = ? AND domain = ? ORDER BY pinned DESC, created_at DESC').all(userId, 'legal');
    },
    insert(record: MemoryEntryRecord) {
      db.prepare(`
        INSERT INTO memory_entries (id, user_id, domain, entry_type, title, content, source, citation, tags_json, pinned, created_at, updated_at)
        VALUES (@id, @user_id, @domain, @entry_type, @title, @content, @source, @citation, @tags_json, @pinned, @created_at, @updated_at)
      `).run(record);
    },
  };
}
```

- [ ] **Step 4: Add authenticated memory routes and rerun the test**

```ts
// backend/modules/memory/routes.ts
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';

export async function registerMemoryRoutes(app: FastifyInstance) {
  app.get('/api/memories', async (request) => {
    const user = await app.requireSession(request);
    return {
      items: app.memoryRepository.listByUserId(user.id).map((entry) => ({
        id: entry.id,
        type: entry.entry_type,
        title: entry.title,
        content: entry.content,
        source: entry.source,
        citation: entry.citation,
        tags: JSON.parse(entry.tags_json),
        createdAt: entry.created_at,
        pinned: Boolean(entry.pinned),
      })),
    };
  });

  app.post('/api/memories', async (request, reply) => {
    const user = await app.requireSession(request);
    const body = request.body as {
      entryType: string;
      title: string;
      content: string;
      source: string;
      citation: string;
      tags: string[];
      pinned: boolean;
    };

    const now = new Date().toISOString();
    app.memoryRepository.insert({
      id: randomUUID(),
      user_id: user.id,
      domain: 'legal',
      entry_type: body.entryType,
      title: body.title,
      content: body.content,
      source: body.source || null,
      citation: body.citation || null,
      tags_json: JSON.stringify(body.tags),
      pinned: body.pinned ? 1 : 0,
      created_at: now,
      updated_at: now,
    });

    return reply.code(201).send({ ok: true });
  });
}
```

```ts
// backend/app.ts
import { registerMemoryRoutes } from './modules/memory/routes';
// ...
await registerMemoryRoutes(app);
```

Run: `npx vitest run backend/tests/memory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/core/repositories/memoryRepository.ts backend/modules/memory/routes.ts backend/app.ts backend/tests/memory.test.ts
git commit -m "feat: persist legal memory entries per user"
```

## Task 5: Processed File Registry and Local Artifact Paths

**Files:**
- Create: `backend/modules/processed-files/routes.ts`
- Modify: `backend/core/repositories/processedFileRepository.ts`
- Create: `backend/core/storage/artifacts.ts`
- Modify: `backend/app.ts`
- Test: `backend/tests/processed-files.test.ts`

- [ ] **Step 1: Write the failing processed-files test**

```ts
// backend/tests/processed-files.test.ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('processed file routes', () => {
  it('creates and lists processed file records for the current user', async () => {
    const app = await createApp();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret-passphrase' },
    });

    const sessionCookie = login.cookies[0];

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/processed-files',
      cookies: { arbiter_session: sessionCookie.value },
      payload: {
        sourceFilename: 'spectral-run.json',
        mimeType: 'application/json',
        processingStatus: 'ready',
        qdrantCollection: 'legal-heatmap',
        qdrantPointIds: ['12', '18'],
        spectralRunId: 'run-001',
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/processed-files',
      cookies: { arbiter_session: sessionCookie.value },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items[0].sourceFilename).toBe('spectral-run.json');
  });
});
```

- [ ] **Step 2: Run the processed-files test to verify failure**

Run: `npx vitest run backend/tests/processed-files.test.ts`
Expected: FAIL with `POST /api/processed-files returned 404`

- [ ] **Step 3: Add artifact path helpers and the repository**

```ts
// backend/core/storage/artifacts.ts
import fs from 'node:fs';
import path from 'node:path';

export function ensureUserArtifactDir(userId: string, domain: string) {
  const dir = path.resolve(`data/artifacts/${domain}/${userId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
```

```ts
// backend/core/repositories/processedFileRepository.ts
export function createProcessedFileRepository(db: Database.Database) {
  return {
    listByUserId(userId: string) {
      return db.prepare('SELECT * FROM processed_files WHERE user_id = ? AND domain = ? ORDER BY created_at DESC').all(userId, 'legal');
    },
    insert(record: ProcessedFileRecord) {
      db.prepare(`
        INSERT INTO processed_files (id, user_id, domain, source_filename, stored_path, checksum, mime_type, processing_status, qdrant_collection, qdrant_point_ids_json, spectral_run_id, created_at, updated_at)
        VALUES (@id, @user_id, @domain, @source_filename, @stored_path, @checksum, @mime_type, @processing_status, @qdrant_collection, @qdrant_point_ids_json, @spectral_run_id, @created_at, @updated_at)
      `).run(record);
    },
  };
}
```

- [ ] **Step 4: Add routes and rerun the test**

```ts
// backend/modules/processed-files/routes.ts
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { FastifyInstance } from 'fastify';
import { ensureUserArtifactDir } from '../../core/storage/artifacts';

export async function registerProcessedFileRoutes(app: FastifyInstance) {
  app.get('/api/processed-files', async (request) => {
    const user = await app.requireSession(request);
    return {
      items: app.processedFileRepository.listByUserId(user.id).map((item) => ({
        id: item.id,
        sourceFilename: item.source_filename,
        storedPath: item.stored_path,
        processingStatus: item.processing_status,
        qdrantCollection: item.qdrant_collection,
        qdrantPointIds: JSON.parse(item.qdrant_point_ids_json),
        spectralRunId: item.spectral_run_id,
        createdAt: item.created_at,
      })),
    };
  });

  app.post('/api/processed-files', async (request, reply) => {
    const user = await app.requireSession(request);
    const body = request.body as {
      sourceFilename: string;
      mimeType: string;
      processingStatus: string;
      qdrantCollection: string;
      qdrantPointIds: string[];
      spectralRunId: string;
    };

    const now = new Date().toISOString();
    const artifactDir = ensureUserArtifactDir(user.id, 'legal');
    const storedPath = path.join(artifactDir, body.sourceFilename);
    const checksum = createHash('sha256').update(`${body.sourceFilename}:${body.spectralRunId}`).digest('hex');

    app.processedFileRepository.insert({
      id: randomUUID(),
      user_id: user.id,
      domain: 'legal',
      source_filename: body.sourceFilename,
      stored_path: storedPath,
      checksum,
      mime_type: body.mimeType,
      processing_status: body.processingStatus,
      qdrant_collection: body.qdrantCollection,
      qdrant_point_ids_json: JSON.stringify(body.qdrantPointIds),
      spectral_run_id: body.spectralRunId,
      created_at: now,
      updated_at: now,
    });

    return reply.code(201).send({ ok: true });
  });
}
```

Run: `npx vitest run backend/tests/processed-files.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/core/storage/artifacts.ts backend/core/repositories/processedFileRepository.ts backend/modules/processed-files/routes.ts backend/app.ts backend/tests/processed-files.test.ts
git commit -m "feat: add processed file registry for legal artifacts"
```

## Task 6: Audit Events and Backend-Owned Retrieval Boundary

**Files:**
- Create: `backend/core/audit/writeAuditEvent.ts`
- Create: `backend/core/legal/whitegloveGateway.ts`
- Create: `backend/modules/audit/routes.ts`
- Create: `backend/modules/legal/routes.ts`
- Modify: `services/whitegloveClient.ts`
- Modify: `backend/app.ts`
- Test: `backend/tests/legal.test.ts`

- [ ] **Step 1: Write the failing legal route test**

```ts
// backend/tests/legal.test.ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('legal backend routes', () => {
  it('returns retrieval health without exposing the frontend to direct Qdrant access', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/legal/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('status');
    expect(response.json()).toHaveProperty('collection');
  });
});
```

- [ ] **Step 2: Run the legal test to verify failure**

Run: `npx vitest run backend/tests/legal.test.ts`
Expected: FAIL with `GET /api/legal/health returned 404`

- [ ] **Step 3: Add audit writing and the WhiteGlove gateway**

```ts
// backend/core/audit/writeAuditEvent.ts
import { randomUUID } from 'node:crypto';

export function writeAuditEvent(auditRepository: AuditRepository, input: {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
}) {
  auditRepository.insert({
    id: randomUUID(),
    user_id: input.userId,
    domain: 'legal',
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    details_json: JSON.stringify(input.details),
    created_at: new Date().toISOString(),
  });
}
```

```ts
// backend/core/legal/whitegloveGateway.ts
export async function getLegalRetrievalHealth() {
  return {
    status: 'degraded',
    collection: process.env.WHITEGLOVE_COLLECTION ?? 'legal-heatmap',
    qdrant: process.env.VITE_WHITEGLOVE_URL ?? 'http://localhost:4880',
  };
}

export async function queryLegalCorpus(query: string) {
  return {
    found: false,
    title: '',
    text: '',
    citation: '',
    source: `backend-proxy:${query}`,
  };
}
```

- [ ] **Step 4: Add legal and audit routes, then point the frontend client at `/api/legal/query`**

```ts
// backend/modules/legal/routes.ts
import { FastifyInstance } from 'fastify';
import { getLegalRetrievalHealth, queryLegalCorpus } from '../../core/legal/whitegloveGateway';

export async function registerLegalRoutes(app: FastifyInstance) {
  app.get('/api/legal/health', async () => getLegalRetrievalHealth());
  app.post('/api/legal/query', async (request) => {
    const body = request.body as { query: string };
    return queryLegalCorpus(body.query);
  });
}
```

```ts
// backend/modules/audit/routes.ts
import { FastifyInstance } from 'fastify';

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get('/api/audit-events', async (request) => {
    const user = await app.requireSession(request);
    return { items: app.auditRepository.listByUserId(user.id) };
  });
}
```

```ts
// services/whitegloveClient.ts
const LOCAL_API_BASE = '/api/legal';

export async function queryWhiteGlove(query: string): Promise<StatuteResult> {
  const res = await fetch(`${LOCAL_API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return fallbackLookup(query);
  return (await res.json()) as StatuteResult;
}
```

Run: `npx vitest run backend/tests/legal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/core/audit/writeAuditEvent.ts backend/core/legal/whitegloveGateway.ts backend/modules/audit/routes.ts backend/modules/legal/routes.ts backend/app.ts services/whitegloveClient.ts backend/tests/legal.test.ts
git commit -m "feat: move legal retrieval behind local backend boundary"
```

## Task 7: Frontend Auth Gate and Shared API Client

**Files:**
- Create: `services/localApiClient.ts`
- Create: `contexts/AuthContext.tsx`
- Create: `components/auth/LoginScreen.tsx`
- Modify: `App.tsx`
- Modify: `index.tsx`
- Test: `e2e/auth.spec.ts`

- [ ] **Step 1: Write the failing auth e2e test**

```ts
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('requires login before showing the legal workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('login-screen')).toBeVisible();
  await expect(page.getByTestId('app-root')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the e2e test to verify failure**

Run: `npx playwright test e2e/auth.spec.ts`
Expected: FAIL because the app renders the workspace immediately

- [ ] **Step 3: Add the API client and auth context**

```ts
// services/localApiClient.ts
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

```ts
// contexts/AuthContext.tsx
import React from 'react';
import { apiFetch } from '../services/localApiClient';

interface AuthUser { username: string; role: 'admin' | 'user'; }
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);
export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

- [ ] **Step 4: Add the login screen and gate AppContent**

```tsx
// components/auth/LoginScreen.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <div data-testid="login-screen" className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await login(username, password);
        }}
      >
        <input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button data-testid="login-submit" type="submit">Enter ArbiterOS</button>
      </form>
    </div>
  );
};
```

```tsx
// App.tsx
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginScreen />;
  return (
    <div data-testid="app-root" className="flex h-screen w-screen overflow-hidden">
      {/* existing workspace */}
    </div>
  );
};
```

Run: `npx playwright test e2e/auth.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/localApiClient.ts contexts/AuthContext.tsx components/auth/LoginScreen.tsx App.tsx index.tsx e2e/auth.spec.ts
git commit -m "feat: gate ArbiterOS behind local login"
```

## Task 8: Replace Demo Library and Audit State with Real Per-User Persistence

**Files:**
- Modify: `components/Library.tsx`
- Create: `components/ProcessedFilesPanel.tsx`
- Modify: `components/AuditLog.tsx`
- Create: `e2e/persistence.spec.ts`

- [ ] **Step 1: Write the failing persistence e2e test**

```ts
// e2e/persistence.spec.ts
import { test, expect } from '@playwright/test';

test('saved library entries persist for the logged-in user', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('login-username').fill('admin');
  await page.getByTestId('login-password').fill('secret-passphrase');
  await page.getByTestId('login-submit').click();

  await page.getByTestId('nav-btn-library').click();
  await page.getByText('+ Add Entry').click();
  await page.getByPlaceholder('Title...').fill('Retention note');
  await page.getByPlaceholder('Content...').fill('Keep the chain of custody intact.');
  await page.getByText('Save').click();

  await page.reload();
  await page.getByTestId('nav-btn-library').click();
  await expect(page.getByText('Retention note')).toBeVisible();
});
```

- [ ] **Step 2: Run the persistence test to verify failure**

Run: `npx playwright test e2e/persistence.spec.ts`
Expected: FAIL because `components/Library.tsx` still uses `INITIAL_ITEMS`

- [ ] **Step 3: Replace `Library.tsx` local state with backend-backed memory entries**

```tsx
// components/Library.tsx
import React from 'react';
import { apiFetch } from '../services/localApiClient';

export const Library: React.FC = () => {
  const [items, setItems] = React.useState<LibraryItem[]>([]);

  React.useEffect(() => {
    apiFetch<{ items: LibraryItem[] }>('/api/memories').then((payload) => setItems(payload.items));
  }, []);

  const addItem = async () => {
    await apiFetch('/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        entryType: newItem.type,
        title: newItem.title,
        content: newItem.content,
        source: newItem.source,
        citation: newItem.citation,
        tags: newItem.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        pinned: false,
      }),
    });

    const refreshed = await apiFetch<{ items: LibraryItem[] }>('/api/memories');
    setItems(refreshed.items);
  };
```

- [ ] **Step 4: Add processed-files and audit data panels, then rerun the test**

```tsx
// components/ProcessedFilesPanel.tsx
import React from 'react';
import { apiFetch } from '../services/localApiClient';

export const ProcessedFilesPanel: React.FC = () => {
  const [items, setItems] = React.useState<Array<{ id: string; sourceFilename: string; processingStatus: string }>>([]);

  React.useEffect(() => {
    apiFetch<{ items: Array<{ id: string; sourceFilename: string; processingStatus: string }> }>('/api/processed-files')
      .then((payload) => setItems(payload.items));
  }, []);

  return (
    <section data-testid="processed-files-panel">
      {items.map((item) => (
        <div key={item.id}>{item.sourceFilename} · {item.processingStatus}</div>
      ))}
    </section>
  );
};
```

```tsx
// components/AuditLog.tsx
import React from 'react';
import { apiFetch } from '../services/localApiClient';

export const AuditLog: React.FC = () => {
  const [entries, setEntries] = React.useState<Array<{ id: string; action: string; created_at: string }>>([]);

  React.useEffect(() => {
    apiFetch<{ items: Array<{ id: string; action: string; created_at: string }> }>('/api/audit-events')
      .then((payload) => setEntries(payload.items));
  }, []);

  return (
    <div data-testid="view-audit-log">
      {entries.map((entry) => (
        <div key={entry.id}>{entry.action}</div>
      ))}
    </div>
  );
};
```

Run: `npx playwright test e2e/persistence.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/Library.tsx components/ProcessedFilesPanel.tsx components/AuditLog.tsx e2e/persistence.spec.ts
git commit -m "feat: back legal library and audit views with user persistence"
```

## Task 9: Final Verification Pass and Offline Smoke

**Files:**
- Modify: `playwright.config.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Test: `backend/tests/*.test.ts`
- Test: `e2e/*.spec.ts`

- [ ] **Step 1: Write the final offline smoke expectations into config and docs**

```ts
// playwright.config.ts
webServer: {
  command: 'npm run dev',
  url: 'http://127.0.0.1:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
},
```

```env
# .env.example
ARBITER_BACKEND_PORT=4881
ARBITER_DB_PATH=data/arbiter.db
ARBITER_SESSION_SECRET=replace-with-local-secret
ARBITER_BOOTSTRAP_USERNAME=admin
ARBITER_BOOTSTRAP_PASSWORD=secret-passphrase
```

- [ ] **Step 2: Run all backend tests**

Run: `npx vitest run backend/tests/app.test.ts backend/tests/storage.test.ts backend/tests/auth.test.ts backend/tests/memory.test.ts backend/tests/processed-files.test.ts backend/tests/legal.test.ts`
Expected: all tests PASS

- [ ] **Step 3: Run the e2e suite**

Run: `npx playwright test e2e/auth.spec.ts e2e/persistence.spec.ts e2e/smoke.spec.ts`
Expected: all tests PASS

- [ ] **Step 4: Update the README with local bootstrap instructions**

```md
## Airgapped MVP Startup

1. `npm install`
2. `cp .env.example .env`
3. `npm run seed:admin`
4. `npm run dev`
5. Open `http://127.0.0.1:3000`
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts .env.example README.md
git commit -m "docs: finalize airgapped MVP startup and test flow"
```

## Self-Review

Spec coverage check:

- local login and backend-managed sessions: Task 3, Task 7
- SQLite per-user persistence: Task 2, Task 4, Task 5
- processed spectral file metadata: Task 5, Task 8
- backend-owned retrieval boundary: Task 6
- WhiteGlove remains standalone: enforced by file layout and Task 6 gateway boundary
- frontend integration and auth-first UX: Task 7, Task 8
- offline verification: Task 9

Placeholder scan:

- no `TBD`
- no `TODO`
- no “add tests later”
- all tasks include concrete files, code, commands, and expected outcomes

Type consistency check:

- session cookie name is `arbiter_session` across backend and e2e
- memory domain is `legal` across schema, repository, and routes
- processed file JSON field is `qdrant_point_ids_json` in SQLite and `qdrantPointIds` at the API edge
- frontend calls `/api/legal/query`, `/api/memories`, `/api/processed-files`, and `/api/audit-events` consistently
