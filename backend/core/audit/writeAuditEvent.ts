import { randomUUID } from 'node:crypto';
import type { AuditEventRecord } from '../repositories/auditRepository';

type AuditRepositoryLike = {
  insert(record: AuditEventRecord): void;
};

export function writeAuditEvent(
  auditRepository: AuditRepositoryLike,
  input: {
    userId: string | null;
    action: string;
    resourceType: string;
    resourceId: string;
    details: Record<string, unknown>;
  },
) {
  const record: AuditEventRecord = {
    id: randomUUID(),
    user_id: input.userId,
    domain: 'legal',
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    details_json: JSON.stringify(input.details),
    created_at: new Date().toISOString(),
  };

  auditRepository.insert(record);
}
