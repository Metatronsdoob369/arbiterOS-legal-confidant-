import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  RegisterProposeRequestSchema,
  RegisterResearchRequestSchema,
  RegisterTranslateRequestSchema,
} from '../../../schemas/legalSchemas';
import {
  getRegisterProposal,
  listRegisterProposals,
  mergeRegisterProposal,
  proposeRegisterEntry,
  rejectRegisterProposal,
} from '../../core/legal/registerAmend';
import { getRegisterLexiconHealth, translateRegister } from '../../core/legal/registerLexicon';
import { researchRegisterTerm } from '../../core/legal/registerResearch';

const ListQuerySchema = z.object({
  status: z.enum(['pending', 'merged', 'rejected']).optional(),
}).strict();

const RejectBodySchema = z.object({
  reason: z.string().trim().max(2000).optional(),
}).strict();

export async function registerRegisterRoutes(app: FastifyInstance) {
  app.get('/api/register/health', async () => getRegisterLexiconHealth());

  app.post('/api/register/translate', async (request, reply) => {
    await (app as any).requireSession(request);
    const parsed = RegisterTranslateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid register translate payload' });
    }

    try {
      return translateRegister(parsed.data);
    } catch (error) {
      request.log.error({ err: error }, 'register translate failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'Register translate failed',
      });
    }
  });

  app.post('/api/register/research', async (request, reply) => {
    await (app as any).requireSession(request);
    const parsed = RegisterResearchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid register research payload' });
    }

    try {
      return researchRegisterTerm(parsed.data);
    } catch (error) {
      request.log.error({ err: error }, 'register research failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'Register research failed',
      });
    }
  });

  app.post('/api/register/propose', async (request, reply) => {
    await (app as any).requireSession(request);
    const parsed = RegisterProposeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid register propose payload', issues: parsed.error.issues });
    }

    try {
      return proposeRegisterEntry(parsed.data);
    } catch (error) {
      request.log.error({ err: error }, 'register propose failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'Register propose failed',
      });
    }
  });

  app.get('/api/register/proposals', async (request, reply) => {
    await (app as any).requireSession(request);
    const parsed = ListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid proposals query' });
    }
    return { proposals: listRegisterProposals(parsed.data) };
  });

  app.get('/api/register/proposals/:id', async (request, reply) => {
    await (app as any).requireSession(request);
    const { id } = request.params as { id: string };
    try {
      return getRegisterProposal(id);
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : 'Proposal not found',
      });
    }
  });

  app.post('/api/register/proposals/:id/merge', async (request, reply) => {
    await (app as any).requireSession(request);
    const { id } = request.params as { id: string };
    try {
      return mergeRegisterProposal(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Merge failed';
      const code = /not found/i.test(message) ? 404 : /not pending/i.test(message) ? 409 : 400;
      return reply.code(code).send({ message });
    }
  });

  app.post('/api/register/proposals/:id/reject', async (request, reply) => {
    await (app as any).requireSession(request);
    const { id } = request.params as { id: string };
    const parsed = RejectBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid reject payload' });
    }
    try {
      return rejectRegisterProposal(id, parsed.data.reason);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reject failed';
      const code = /not found/i.test(message) ? 404 : /not pending/i.test(message) ? 409 : 400;
      return reply.code(code).send({ message });
    }
  });
}
