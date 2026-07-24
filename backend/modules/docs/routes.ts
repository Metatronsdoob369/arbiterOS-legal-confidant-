import type { FastifyInstance } from 'fastify';
import {
  getDocsCatalog,
  getDocsDepartment,
  getDocsEntry,
  listDocsDepartments,
  searchDocsCatalog,
} from '../../core/legal/docsCatalog';

export async function registerDocsRoutes(app: FastifyInstance) {
  app.get('/api/docs/departments', async (request) => {
    await (app as any).requireSession(request);
    return { departments: listDocsDepartments() };
  });

  app.get('/api/docs/departments/:id', async (request, reply) => {
    await (app as any).requireSession(request);
    const { id } = request.params as { id: string };
    try {
      return getDocsDepartment(id);
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : 'Department not found',
      });
    }
  });

  app.get('/api/docs/catalogs/:catalogId', async (request, reply) => {
    await (app as any).requireSession(request);
    const { catalogId } = request.params as { catalogId: string };
    const query = request.query as {
      q?: string;
      kind?: string;
      limit?: string;
      offset?: string;
    };
    try {
      // Ensure catalog exists (throws 404-style)
      getDocsCatalog(catalogId);
      const result = searchDocsCatalog(catalogId, {
        q: query.q,
        kind: query.kind,
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
      });
      return {
        catalog_id: catalogId,
        total: result.total,
        entries: result.entries,
      };
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : 'Catalog not found',
      });
    }
  });

  app.get('/api/docs/entries/:entryId', async (request, reply) => {
    await (app as any).requireSession(request);
    const { entryId } = request.params as { entryId: string };
    try {
      return getDocsEntry(decodeURIComponent(entryId));
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : 'Entry not found',
      });
    }
  });
}
