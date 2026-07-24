import { randomUUID } from 'node:crypto';
import { hashPassword } from '../core/auth/passwords';
import { createDatabase } from '../core/storage/database';
import { createUserRepository } from '../core/repositories/userRepository';

const dbPath = process.env.ARBITER_DB_PATH ?? 'data/arbiter.db';
const username = process.env.ARBITER_BOOTSTRAP_USERNAME ?? 'admin';
const password = process.env.ARBITER_BOOTSTRAP_PASSWORD ?? 'secret-passphrase';
const now = new Date().toISOString();

const db = createDatabase(dbPath);
const userRepository = createUserRepository(db);
const passwordHash = await hashPassword(password);

userRepository.insert({
  id: randomUUID(),
  username,
  password_hash: passwordHash,
  role: 'admin',
  created_at: now,
  last_login_at: null,
  disabled_at: null,
});

db.close();
