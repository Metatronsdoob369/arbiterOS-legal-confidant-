import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { FastifyInstance } from 'fastify';
import {
  DocumentDraftSchema,
  DocumentExportRequestSchema,
  DocumentProvenanceSchema,
  FormGenerationSchema,
} from '../../../schemas/legalSchemas';
import { writeAuditEvent } from '../../core/audit/writeAuditEvent';
import {
  createFormDraft,
  loadDraftFromDisk,
  saveDraftToDisk,
} from '../../core/legal/formGeneration';
import { exportDraftToWord } from '../../core/legal/legalExport';
import { runFormTemplate } from '../../core/legal/templates';
import { createArtifactPath } from '../../core/storage/artifacts';

export async function registerDraftRoutes(app: FastifyInstance) {
  app.post('/api/drafts/forms', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const parsedBody = FormGenerationSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        message: 'Invalid form generation payload',
        issues: parsedBody.error.issues,
      });
    }

    const body = request.body as Record<string, unknown>;
    const provenanceParse = DocumentProvenanceSchema.safeParse(body.provenance ?? {
      citations: [],
      holdings: [],
      source_refs: [],
    });

    const { draft, generated_content } = await createFormDraft(parsedBody.data, {
      userId: user.id,
      provenance: provenanceParse.success ? provenanceParse.data : undefined,
    });

    writeAuditEvent((app as any).auditRepository, {
      userId: user.id,
      action: 'drafts.form_create',
      resourceType: 'document_draft',
      resourceId: draft.id,
      details: {
        form_type: draft.form.form_type,
        passed: draft.passed,
        stepCount: draft.validation_steps.length,
      },
    });

    return {
      draft_id: draft.id,
      form_type: draft.form.form_type,
      markdown: draft.markdown,
      validation_steps: draft.validation_steps,
      passed: draft.passed,
      generated_content,
      provenance: draft.provenance,
      created_at: draft.created_at,
    };
  });

  app.post('/api/drafts/export', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const parsedBody = DocumentExportRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        message: 'Invalid document export payload',
        issues: parsedBody.error.issues,
      });
    }

    let draft = 'draft_id' in parsedBody.data
      ? loadDraftFromDisk(user.id, parsedBody.data.draft_id)
      : null;

    if (!draft && 'draft' in parsedBody.data) {
      // Never trust client-supplied passed/validation — re-run the template gate.
      const inline = DocumentDraftSchema.parse(parsedBody.data.draft);
      const validated = await runFormTemplate(inline.form);
      draft = DocumentDraftSchema.parse({
        ...inline,
        markdown: validated.markdown,
        validation_steps: validated.validation_steps,
        passed: validated.passed,
      });
      saveDraftToDisk(user.id, draft);
    }

    if (!draft) {
      return reply.code(404).send({ message: 'Draft not found' });
    }

    if (!draft.passed) {
      return reply.code(409).send({
        message: 'Export blocked: draft validation did not pass',
        draft_id: draft.id,
        validation_steps: draft.validation_steps,
      });
    }

    const exportResult = await exportDraftToWord(user.id, draft);
    const now = new Date().toISOString();

    (app as any).processedFileRepository.insert({
      id: exportResult.processed_file_id,
      user_id: user.id,
      domain: 'legal',
      source_filename: exportResult.filename,
      stored_path: exportResult.artifact_path,
      checksum: exportResult.checksum,
      mime_type: exportResult.mime_type,
      processing_status: 'exported',
      qdrant_collection: null,
      qdrant_point_ids_json: '[]',
      spectral_run_id: null,
      created_at: now,
      updated_at: now,
    });

    const exportMetaPath = createArtifactPath(user.id, 'legal', `draft-${draft.id}.export.json`);
    fs.writeFileSync(exportMetaPath, JSON.stringify(exportResult, null, 2), 'utf8');

    writeAuditEvent((app as any).auditRepository, {
      userId: user.id,
      action: 'drafts.export',
      resourceType: 'document_export',
      resourceId: exportResult.processed_file_id,
      details: {
        draft_id: draft.id,
        form_type: draft.form.form_type,
        filename: exportResult.filename,
        size_bytes: exportResult.size_bytes,
        checksum: exportResult.checksum,
      },
    });

    return exportResult;
  });

  app.get('/api/drafts/:id/download', async (request, reply) => {
    const user = await (app as any).requireSession(request);
    const draftId = (request.params as { id: string }).id;
    const draft = loadDraftFromDisk(user.id, draftId);

    if (!draft) {
      return reply.code(404).send({ message: 'Draft not found' });
    }

    const docxPath = createArtifactPath(user.id, 'legal', `draft-${draftId}.docx`);
    if (!fs.existsSync(docxPath)) {
      if (!draft.passed) {
        return reply.code(409).send({
          message: 'Export blocked: draft validation did not pass',
          draft_id: draftId,
        });
      }

      // Lazy-export on first download when validation already passed.
      const exportResult = await exportDraftToWord(user.id, draft);
      const now = new Date().toISOString();
      (app as any).processedFileRepository.insert({
        id: exportResult.processed_file_id,
        user_id: user.id,
        domain: 'legal',
        source_filename: exportResult.filename,
        stored_path: exportResult.artifact_path,
        checksum: exportResult.checksum,
        mime_type: exportResult.mime_type,
        processing_status: 'exported',
        qdrant_collection: null,
        qdrant_point_ids_json: '[]',
        spectral_run_id: null,
        created_at: now,
        updated_at: now,
      });
    }

    const buffer = fs.readFileSync(docxPath);
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const filename = `draft-${draftId}.docx`;

    writeAuditEvent((app as any).auditRepository, {
      userId: user.id,
      action: 'drafts.download',
      resourceType: 'document_export',
      resourceId: draftId,
      details: {
        draft_id: draftId,
        filename,
        checksum,
        size_bytes: buffer.byteLength,
      },
    });

    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('X-Checksum-SHA256', checksum)
      .send(buffer);
  });
}
