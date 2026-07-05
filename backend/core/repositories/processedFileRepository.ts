export interface ProcessedFileRecord {
  id: string;
  user_id: string;
  domain: string;
  source_filename: string;
  stored_path: string;
  checksum: string;
  mime_type: string;
  processing_status: string;
  qdrant_collection: string | null;
  qdrant_point_ids_json: string;
  spectral_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export function createProcessedFileRepository(db: any) {
  return {
    listByUserId(userId: string, domain = 'legal'): ProcessedFileRecord[] {
      return db.prepare('SELECT * FROM processed_files WHERE user_id = ? AND domain = ? ORDER BY created_at DESC').all(userId, domain) as ProcessedFileRecord[];
    },

    findById(id: string, domain = 'legal'): ProcessedFileRecord | undefined {
      return db.prepare('SELECT * FROM processed_files WHERE id = ? AND domain = ?').get(id, domain) as ProcessedFileRecord | undefined;
    },

    insert(record: ProcessedFileRecord) {
      db.prepare(`
        INSERT INTO processed_files (
          id, user_id, domain, source_filename, stored_path, checksum, mime_type,
          processing_status, qdrant_collection, qdrant_point_ids_json, spectral_run_id,
          created_at, updated_at
        ) VALUES (
          @id, @user_id, @domain, @source_filename, @stored_path, @checksum, @mime_type,
          @processing_status, @qdrant_collection, @qdrant_point_ids_json, @spectral_run_id,
          @created_at, @updated_at
        )
      `).run(record);
    },

    updateStatus(id: string, processingStatus: string, updatedAt: string) {
      db.prepare('UPDATE processed_files SET processing_status = ?, updated_at = ? WHERE id = ?').run(processingStatus, updatedAt, id);
    },
  };
}
