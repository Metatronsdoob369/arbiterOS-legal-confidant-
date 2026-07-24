export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login_at: string | null;
  disabled_at: string | null;
}

export function createUserRepository(db: any) {
  return {
    findById(id: string): UserRecord | undefined {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
    },

    findByUsername(username: string): UserRecord | undefined {
      return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRecord | undefined;
    },

    insert(record: UserRecord) {
      db.prepare(`
        INSERT OR IGNORE INTO users (
          id, username, password_hash, role, created_at, last_login_at, disabled_at
        ) VALUES (
          @id, @username, @password_hash, @role, @created_at, @last_login_at, @disabled_at
        )
      `).run(record);
    },

    updateLastLoginAt(id: string, lastLoginAt: string) {
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(lastLoginAt, id);
    },
  };
}
