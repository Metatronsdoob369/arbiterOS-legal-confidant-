import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const MemoryIdParamSchema = z.object({
  id: z.string().trim().min(1).max(128),
}).strict();

const MemoryCreateSchema = z.object({
  entryType: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(256),
  content: z.string().trim().min(1).max(10000),
  source: z.string().trim().max(256).optional(),
  citation: z.string().trim().max(512).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(25).default([]),
  pinned: z.boolean().default(false),
}).strict();

function toMemoryItem(entry: {
  id: string;
  entry_type: string;
  title: string;
  content: string;
  source: string | null;
  citation: string | null;
  tags_json: string;
  created_at: string;
  updated_at: string;
  pinned: number;
}) {
  return {
    id: entry.id,
    type: entry.entry_type,
    title: entry.title,
    content: entry.content,
    source: entry.source,
    citation: entry.citation,
    tags: JSON.parse(entry.tags_json) as string[],
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    pinned: Boolean(entry.pinned),
  };
}

export async function registerMemoryRoutes(app: FastifyInstance) {
  app.get('/api/memories', async (request) => {
    const user = await (app as any).requireSession(request);
    const items = (app as any).memoryRepository
      .listByUserId(user.id, 'legal')
      .map(toMemoryItem);

    return { items };
  });

  app.post('/api/memories', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const parsedBody = MemoryCreateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Invalid memory payload' });
    }

    const now = new Date().toISOString();
    const { entryType, title, content, source, citation, tags, pinned } = parsedBody.data;
    const normalizedSource = source?.trim() ? source : null;
    const normalizedCitation = citation?.trim() ? citation : null;

    (app as any).memoryRepository.insert({
      id: randomUUID(),
      user_id: user.id,
      domain: 'legal',
      entry_type: entryType,
      title,
      content,
      source: normalizedSource,
      citation: normalizedCitation,
      tags_json: JSON.stringify(tags),
      pinned: pinned ? 1 : 0,
      created_at: now,
      updated_at: now,
    });

    return reply.code(201).send({ ok: true });
  });

  app.patch('/api/memories/:id/pin', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const params = MemoryIdParamSchema.safeParse(request.params);
    const body = z.object({ pinned: z.boolean() }).strict().safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({ message: 'Invalid memory pin payload' });
    }

    const item = (app as any).memoryRepository.findById(params.data.id, 'legal');
    if (!item || item.user_id !== user.id) {
      return reply.code(404).send({ message: 'Memory entry not found' });
    }

    (app as any).memoryRepository.updatePinned(item.id, body.data.pinned, new Date().toISOString());
    return { ok: true };
  });

  app.delete('/api/memories/:id', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const params = MemoryIdParamSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ message: 'Invalid memory id' });
    }

    const item = (app as any).memoryRepository.findById(params.data.id, 'legal');
    if (!item || item.user_id !== user.id) {
      return reply.code(404).send({ message: 'Memory entry not found' });
    }

    (app as any).memoryRepository.deleteById(item.id, 'legal');
    return { ok: true };
  });
}
