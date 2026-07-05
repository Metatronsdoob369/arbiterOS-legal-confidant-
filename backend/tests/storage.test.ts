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
