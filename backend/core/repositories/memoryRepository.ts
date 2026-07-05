export interface MemoryEntryRecord {
  id: string;
  user_id: string;
  domain: string;
  entry_type: string;
  title: string;
  content: string;
  source: string | null;
  citation: string | null;
  tags_json: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export function createMemoryRepository(db: any) {
  return {
    listByUserId(userId: string, domain = 'legal'): MemoryEntryRecord[] {
      return db.prepare('SELECT * FROM memory_entries WHERE user_id = ? AND domain = ? ORDER BY pinned DESC, created_at DESC').all(userId, domain) as MemoryEntryRecord[];
    },

    findById(id: string, domain = 'legal'): MemoryEntryRecord | undefined {
      return db.prepare('SELECT * FROM memory_entries WHERE id = ? AND domain = ?').get(id, domain) as MemoryEntryRecord | undefined;
    },

    insert(record: MemoryEntryRecord) {
      db.prepare(`
        INSERT INTO memory_entries (
          id, user_id, domain, entry_type, title, content, source, citation,
          tags_json, pinned, created_at, updated_at
        ) VALUES (
          @id, @user_id, @domain, @entry_type, @title, @content, @source, @citation,
          @tags_json, @pinned, @created_at, @updated_at
        )
      `).run(record);
    },

    updatePinned(id: string, pinned: boolean, updatedAt: string) {
      db.prepare('UPDATE memory_entries SET pinned = ?, updated_at = ? WHERE id = ?').run(pinned ? 1 : 0, updatedAt, id);
    },

    deleteById(id: string, domain = 'legal') {
      db.prepare('DELETE FROM memory_entries WHERE id = ? AND domain = ?').run(id, domain);
    },
  };
}
