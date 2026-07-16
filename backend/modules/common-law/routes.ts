import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  bootstrapSeedHoldings,
  checkCollectionHealth,
  embedTexts,
  queryHoldings,
} from '../../core/legal/commonLawEngine';

const EmbedRequestSchema = z.object({
  texts: z.array(z.string().trim().min(1)).min(1).max(64),
}).strict();

const CommonLawQuerySchema = z.object({
  query: z.string().trim().min(1).max(2048),
  statute: z.string().trim().min(1).max(256).optional(),
  topK: z.coerce.number().int().min(1).max(10).optional(),
}).strict();

export async function registerCommonLawRoutes(app: FastifyInstance) {
  app.get('/api/common-law/health', async () => checkCollectionHealth());

  app.post('/api/common-law/bootstrap', async () => bootstrapSeedHoldings());

  app.post('/api/common-law/query', async (request, reply) => {
    const parsedBody = CommonLawQuerySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Invalid common-law query payload' });
    }

    return queryHoldings(parsedBody.data);
  });

  app.post('/embed', async (request, reply) => {
    const parsedBody = EmbedRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Invalid embed payload' });
    }

    return {
      embeddings: await embedTexts(parsedBody.data.texts),
    };
  });
}
