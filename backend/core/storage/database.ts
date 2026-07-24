import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const migrationPath = fileURLToPath(new URL('./migrations/001_init.sql', import.meta.url));

function ensureDatabaseDir(filename: string) {
  if (filename === ':memory:' || filename === '') {
    return;
  }

  const directory = path.dirname(filename);
  if (directory && directory !== '.') {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function createDatabase(filename: string) {
  ensureDatabaseDir(filename);

  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(migrationPath, 'utf8'));
  return db;
}
