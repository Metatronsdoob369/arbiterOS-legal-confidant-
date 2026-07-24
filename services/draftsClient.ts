import {
  FormGenerationSchema,
  type FormGenerationInput,
  type ValidationStep,
} from '../schemas/legalSchemas';
import { apiFetch } from './localApiClient';

export type DraftFormResponse = {
  draft_id: string;
  form_type: string;
  markdown: string;
  validation_steps: ValidationStep[];
  passed: boolean;
  generated_content?: string;
  created_at: string;
};

export async function createDraftForm(input: unknown): Promise<DraftFormResponse> {
  const parsed = FormGenerationSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid form generation payload: ${details}`);
  }

  return apiFetch<DraftFormResponse>('/api/drafts/forms', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  });
}

export async function exportDraftToWord(draftId: string) {
  return apiFetch('/api/drafts/export', {
    method: 'POST',
    body: JSON.stringify({ draft_id: draftId, format: 'docx' }),
  });
}

export function draftDownloadUrl(draftId: string) {
  return `/api/drafts/${encodeURIComponent(draftId)}/download`;
}

export type { FormGenerationInput };
