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

export function createAuditRepository(db: any) {
  return {
    insert(record: AuditEventRecord) {
      db.prepare(`
        INSERT INTO audit_events (
          id, user_id, domain, action, resource_type, resource_id, details_json, created_at
        ) VALUES (
          @id, @user_id, @domain, @action, @resource_type, @resource_id, @details_json, @created_at
        )
      `).run(record);
    },

    listByUserId(userId: string): AuditEventRecord[] {
      return db.prepare('SELECT * FROM audit_events WHERE user_id = ? ORDER BY created_at DESC').all(userId) as AuditEventRecord[];
    },
  };
}
