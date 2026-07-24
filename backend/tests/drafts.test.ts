import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormGenerationSchema } from '../../schemas/legalSchemas';
import { createFormDraft, loadDraftFromDisk } from '../core/legal/formGeneration';
import { exportDraftToWord } from '../core/legal/legalExport';

const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arbiter-drafts-unit-'));

vi.mock('../core/storage/artifacts', () => ({
  ensureUserArtifactDir(userId: string, domain: string) {
    const dir = path.join(artifactRoot, domain, userId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
  createArtifactPath(userId: string, domain: string, filename: string) {
    const dir = path.join(artifactRoot, domain, userId);
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, path.basename(filename));
  },
}));

vi.mock('../core/legal/formChecks', () => ({
  verifyNegotiability: vi.fn(async () => ({
    rule_id: 'UCC_3_104',
    passed: true,
    details: 'PASSED: Instrument meets all UCC 3-104 requirements for negotiability.',
    evidence_source: 'UCC 3-104',
    timestamp: new Date().toISOString(),
  })),
  consultStatuteCitation: vi.fn(async (query: string) => query),
}));

import * as formChecks from '../core/legal/formChecks';

beforeEach(() => {
  vi.mocked(formChecks.verifyNegotiability).mockResolvedValue({
    rule_id: 'UCC_3_104',
    passed: true,
    details: 'PASSED: Instrument meets all UCC 3-104 requirements for negotiability.',
    evidence_source: 'UCC 3-104',
    timestamp: new Date().toISOString(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('drafts pipeline (sqlite-free)', () => {
  it('rejects invalid form payloads at the Zod boundary', () => {
    const parsed = FormGenerationSchema.safeParse({
      form_type: 'promissory_note_ucc',
      amount: 1000,
    });

    expect(parsed.success).toBe(false);
  });

  it('creates a form draft and exports a Word document when validation passes', async () => {
    const { draft, generated_content } = await createFormDraft({
      form_type: 'promissory_note_ucc',
      amount: 15000,
      lender: 'Acme Capital',
      borrower: 'Jordan Doe',
      state: 'Alabama',
    }, { userId: 'user-admin' });

    expect(draft.passed).toBe(true);
    expect(draft.id).toBeTruthy();
    expect(generated_content).toContain('PROMISSORY NOTE');
    expect(loadDraftFromDisk('user-admin', draft.id)?.id).toBe(draft.id);

    const exportResult = await exportDraftToWord('user-admin', draft);
    expect(exportResult.mime_type).toContain('wordprocessingml');
    expect(exportResult.size_bytes).toBeGreaterThan(1000);
    expect(fs.existsSync(exportResult.artifact_path)).toBe(true);

    const buffer = fs.readFileSync(exportResult.artifact_path);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });

  it('blocks export when validation fails', async () => {
    vi.mocked(formChecks.verifyNegotiability).mockResolvedValue({
      rule_id: 'UCC_3_104',
      passed: false,
      details: 'FAILED: Non-negotiable.',
      evidence_source: 'UCC 3-104',
      timestamp: new Date().toISOString(),
    });

    const { draft } = await createFormDraft({
      form_type: 'promissory_note_ucc',
      amount: 15000,
      lender: 'Acme Capital',
      borrower: 'Jordan Doe',
    }, { userId: 'user-admin' });

    expect(draft.passed).toBe(false);
    await expect(exportDraftToWord('user-admin', draft)).rejects.toThrow(/validation did not pass/i);
  });

  it('persists draft JSON under the user artifact tree', async () => {
    const { draft } = await createFormDraft({
      form_type: 'nda',
      disclosing_party: 'Acme Corp',
      receiving_party: 'Beta LLC',
      purpose: 'evaluating a joint venture',
      term_years: 3,
    }, { userId: 'user-admin' });

    const reloaded = loadDraftFromDisk('user-admin', draft.id);
    expect(reloaded?.form.form_type).toBe('nda');
    expect(reloaded?.passed).toBe(true);
    expect(reloaded?.validation_steps[0]?.rule_id).toBe('R5_CONFIDENTIALITY');
  });
});
