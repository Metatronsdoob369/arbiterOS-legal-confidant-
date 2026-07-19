import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import {
  DocumentDraftSchema,
  DocumentProvenanceSchema,
  FormGenerationSchema,
  type DocumentDraft,
  type DocumentProvenance,
  type FormGenerationInput,
} from '../../../schemas/legalSchemas';
import { createArtifactPath } from '../storage/artifacts';
import { runFormTemplate } from './templates';

export type CreateFormDraftResult = {
  draft: DocumentDraft;
  generated_content?: string;
};

export function draftArtifactFilename(draftId: string) {
  return `draft-${draftId}.json`;
}

export function loadDraftFromDisk(userId: string, draftId: string): DocumentDraft | null {
  const path = createArtifactPath(userId, 'legal', draftArtifactFilename(draftId));
  if (!fs.existsSync(path)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
    const parsed = DocumentDraftSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveDraftToDisk(userId: string, draft: DocumentDraft) {
  const path = createArtifactPath(userId, 'legal', draftArtifactFilename(draft.id));
  fs.writeFileSync(path, JSON.stringify(draft, null, 2), 'utf8');
  return path;
}

export async function createFormDraft(
  input: FormGenerationInput,
  options: {
    userId: string;
    provenance?: DocumentProvenance;
  },
): Promise<CreateFormDraftResult> {
  const parsed = FormGenerationSchema.parse(input);
  const result = await runFormTemplate(parsed);
  const provenance = DocumentProvenanceSchema.parse(options.provenance ?? {
    citations: [],
    holdings: [],
    source_refs: [],
  });

  const draft: DocumentDraft = DocumentDraftSchema.parse({
    id: randomUUID(),
    form: parsed,
    markdown: result.markdown,
    validation_steps: result.validation_steps,
    passed: result.passed,
    provenance,
    created_at: new Date().toISOString(),
  });

  saveDraftToDisk(options.userId, draft);

  return {
    draft,
    generated_content: result.passed ? result.markdown : undefined,
  };
}
