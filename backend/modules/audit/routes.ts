import type { FastifyInstance } from 'fastify';

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get('/api/audit-events', async (request) => {
    const user = await (app as any).requireSession(request);
    const items = (app as any).auditRepository.listByUserId(user.id).map((entry: any) => ({
      id: entry.id,
      userId: entry.user_id,
      domain: entry.domain,
      action: entry.action,
      resourceType: entry.resource_type,
      resourceId: entry.resource_id,
      details: JSON.parse(entry.details_json),
      createdAt: entry.created_at,
    }));

    return { items };
  });
}
