import type { FastifyInstance } from 'fastify';
import { ColdMapConsultRequestSchema } from '../../../schemas/legalSchemas';
import {
  AdvanceLaneRequestSchema,
  AttachEvidenceRequestSchema,
  CreateHypothesisRequestSchema,
  ExportLedgerQuerySchema,
  LEDGER_BELT_VERSION,
  QueryLedgerRequestSchema,
  UpsertCaseRequestSchema,
} from '../../../schemas/hypothesisLedger';
import { consultColdMap, getColdMapHealth } from '../../core/legal/pcon/coldMap';
import {
  advanceLane,
  attachEvidence,
  createHypothesis,
  ensureSeedLedger,
  exportLedgerMarkdown,
  queryHypotheses,
  upsertCase,
} from '../../core/legal/pcon/hypothesisLedger';

export async function registerPconRoutes(app: FastifyInstance) {
  app.get('/api/pcon/cold-map/health', async () => getColdMapHealth());

  app.post('/api/pcon/cold-map/consult', async (request, reply) => {
    await (app as any).requireSession(request);
    const parsed = ColdMapConsultRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid cold-map consult payload' });
    }

    try {
      return consultColdMap(parsed.data);
    } catch (error) {
      request.log.error({ err: error }, 'cold-map consult failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'Cold-map consult failed',
      });
    }
  });

  registerLedgerRoutes(app);
}

function registerLedgerRoutes(app: FastifyInstance) {
  app.get('/api/pcon/ledger/health', async () => {
    const ledger = ensureSeedLedger();
    return {
      ok: true,
      belt_version: LEDGER_BELT_VERSION,
      hypothesis_count: ledger.hypotheses.length,
    };
  });

  app.post('/api/pcon/ledger/cases', async (request, reply) => {
    await (app as any).requireSession(request);
    ensureSeedLedger();
    const parsed = UpsertCaseRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid case payload' });
    }
    try {
      return upsertCase({
        ...parsed.data,
        focus_hypothesis_ids: parsed.data.focus_hypothesis_ids ?? [],
        working_premise_ids: parsed.data.working_premise_ids ?? [],
      });
    } catch (error) {
      request.log.error({ err: error }, 'ledger upsertCase failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'upsertCase failed',
      });
    }
  });

  app.post('/api/pcon/ledger/hypotheses', async (request, reply) => {
    await (app as any).requireSession(request);
    ensureSeedLedger();
    const parsed = CreateHypothesisRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid hypothesis payload' });
    }
    try {
      return createHypothesis(parsed.data);
    } catch (error) {
      request.log.error({ err: error }, 'ledger createHypothesis failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'createHypothesis failed',
      });
    }
  });

  app.post<{ Params: { id: string } }>(
    '/api/pcon/ledger/hypotheses/:id/evidence',
    async (request, reply) => {
      await (app as any).requireSession(request);
      ensureSeedLedger();
      const parsed = AttachEvidenceRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid evidence payload' });
      }
      try {
        return attachEvidence(request.params.id, parsed.data);
      } catch (error) {
        request.log.error({ err: error }, 'ledger attachEvidence failed');
        const notFound = error instanceof Error && /not found/.test(error.message);
        return reply.code(notFound ? 404 : 500).send({
          message: error instanceof Error ? error.message : 'attachEvidence failed',
        });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/pcon/ledger/hypotheses/:id/advance',
    async (request, reply) => {
      await (app as any).requireSession(request);
      ensureSeedLedger();
      const parsed = AdvanceLaneRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid advance payload' });
      }
      try {
        return advanceLane({
          hypothesisId: request.params.id,
          toLane: parsed.data.toLane,
          seal: parsed.data.seal,
          actor: parsed.data.actor,
        });
      } catch (error) {
        request.log.error({ err: error }, 'ledger advanceLane failed');
        const notFound = error instanceof Error && /not found/.test(error.message);
        return reply.code(notFound ? 404 : 400).send({
          message: error instanceof Error ? error.message : 'advanceLane failed',
        });
      }
    },
  );

  app.post('/api/pcon/ledger/query', async (request, reply) => {
    await (app as any).requireSession(request);
    ensureSeedLedger();
    const parsed = QueryLedgerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid query payload' });
    }
    try {
      return { results: queryHypotheses(parsed.data) };
    } catch (error) {
      request.log.error({ err: error }, 'ledger query failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'query failed',
      });
    }
  });

  app.get('/api/pcon/ledger/export', async (request, reply) => {
    await (app as any).requireSession(request);
    ensureSeedLedger();
    const parsed = ExportLedgerQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid export query' });
    }
    try {
      const markdown = exportLedgerMarkdown(parsed.data);
      return reply.type('text/markdown').send(markdown);
    } catch (error) {
      request.log.error({ err: error }, 'ledger export failed');
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'export failed',
      });
    }
  });
}
