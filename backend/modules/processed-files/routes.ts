import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createArtifactPath } from '../../core/storage/artifacts';

const ProcessedFileCreateSchema = z.object({
  sourceFilename: z.string().trim().min(1).max(256),
  mimeType: z.string().trim().min(1).max(128),
  processingStatus: z.string().trim().min(1).max(64),
  qdrantCollection: z.string().trim().min(1).max(128),
  qdrantPointIds: z.array(z.string().trim().min(1).max(128)).max(100).default([]),
  spectralRunId: z.string().trim().min(1).max(128),
}).strict();

function toProcessedFileItem(entry: {
  id: string;
  source_filename: string;
  stored_path: string;
  processing_status: string;
  qdrant_collection: string | null;
  qdrant_point_ids_json: string;
  spectral_run_id: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: entry.id,
    sourceFilename: entry.source_filename,
    storedPath: entry.stored_path,
    processingStatus: entry.processing_status,
    qdrantCollection: entry.qdrant_collection,
    qdrantPointIds: JSON.parse(entry.qdrant_point_ids_json) as string[],
    spectralRunId: entry.spectral_run_id,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

export async function registerProcessedFileRoutes(app: FastifyInstance) {
  app.get('/api/processed-files', async (request) => {
    const user = await (app as any).requireSession(request);
    return {
      items: (app as any).processedFileRepository
        .listByUserId(user.id, 'legal')
        .map(toProcessedFileItem),
    };
  });

  app.post('/api/processed-files', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const parsedBody = ProcessedFileCreateSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Invalid processed file payload' });
    }

    const now = new Date().toISOString();
    const {
      sourceFilename,
      mimeType,
      processingStatus,
      qdrantCollection,
      qdrantPointIds,
      spectralRunId,
    } = parsedBody.data;
    const storedPath = createArtifactPath(user.id, 'legal', sourceFilename);
    const checksum = createHash('sha256')
      .update(JSON.stringify({
        sourceFilename,
        mimeType,
        processingStatus,
        qdrantCollection,
        qdrantPointIds,
        spectralRunId,
      }))
      .digest('hex');

    (app as any).processedFileRepository.insert({
      id: randomUUID(),
      user_id: user.id,
      domain: 'legal',
      source_filename: sourceFilename,
      stored_path: storedPath,
      checksum,
      mime_type: mimeType,
      processing_status: processingStatus,
      qdrant_collection: qdrantCollection,
      qdrant_point_ids_json: JSON.stringify(qdrantPointIds),
      spectral_run_id: spectralRunId,
      created_at: now,
      updated_at: now,
    });

    return reply.code(201).send({ ok: true });
  });
}
