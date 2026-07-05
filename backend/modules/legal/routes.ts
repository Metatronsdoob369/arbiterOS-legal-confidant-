import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeAuditEvent } from '../../core/audit/writeAuditEvent';
import { getLegalRetrievalHealth, queryLegalCorpus } from '../../core/legal/whitegloveGateway';

const LegalQuerySchema = z.object({
  query: z.string().trim().min(1).max(2048),
}).strict();

export async function registerLegalRoutes(app: FastifyInstance) {
  app.get('/api/legal/health', async () => getLegalRetrievalHealth());

  app.post('/api/legal/query', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const parsedBody = LegalQuerySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Invalid legal query payload' });
    }

    const result = await queryLegalCorpus(parsedBody.data.query);
    const queryHash = createHash('sha256').update(parsedBody.data.query).digest('hex');

    writeAuditEvent((app as any).auditRepository, {
      userId: user.id,
      action: 'legal.query',
      resourceType: 'legal_query',
      resourceId: queryHash,
      details: {
        queryHash,
        queryLength: parsedBody.data.query.length,
        found: result.found,
        source: result.source,
      },
    });

    return result;
  });
}
