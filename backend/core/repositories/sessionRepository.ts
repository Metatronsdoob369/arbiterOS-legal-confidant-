export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export function createSessionRepository(db: any) {
  return {
    insert(record: SessionRecord) {
      db.prepare(`
        INSERT INTO sessions (
          id, user_id, token_hash, created_at, expires_at, revoked_at
        ) VALUES (
          @id, @user_id, @token_hash, @created_at, @expires_at, @revoked_at
        )
      `).run(record);
    },

    findActiveByTokenHash(tokenHash: string): SessionRecord | undefined {
      return db.prepare(`
        SELECT * FROM sessions
        WHERE token_hash = ?
          AND revoked_at IS NULL
          AND expires_at > ?
      `).get(tokenHash, new Date().toISOString()) as SessionRecord | undefined;
    },

    revokeById(id: string, revokedAt: string) {
      db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(revokedAt, id);
    },
  };
}
