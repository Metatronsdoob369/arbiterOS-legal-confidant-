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
