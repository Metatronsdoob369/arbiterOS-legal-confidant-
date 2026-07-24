/**
 * Hypothesis Ledger — Belt-Enforced Pre-Truth Schemas
 *
 * Canonical home for case/strategy, hypotheses, and ledger envelopes.
 * Reuses ValidationStepSchema from legalSchemas (no circular imports).
 */

import { z } from 'zod';
import { ValidationStepSchema } from './legalSchemas';

export const LEDGER_BELT_VERSION = '0.1.0' as const;

export const LedgerEvidenceRefSchema = z.object({
  type: z.enum([
    'holding',
    'statute',
    'opinion',
    'drive',
    'procedure',
    'spine',
    'cold_map',
    'other',
  ]),
  ref: z.string().min(1),
  weight: z.number().min(0).max(1).optional(),
  epistemic_ceiling: z
    .enum(['plain', 'settled', 'institutional', 'contested'])
    .optional(),
});
export type LedgerEvidenceRef = z.infer<typeof LedgerEvidenceRefSchema>;

export const HypothesisSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  claim: z.string().min(1),
  lane: z.enum([
    'working_premise',
    'study',
    'procedural_potential',
    'sealed_executable',
    'parked',
    'burned',
  ]),
  disposition: z.enum(['open', 'supported', 'refuted', 'archived']),
  confidence: z.number().min(0).max(1),
  evidence_refs: z.array(LedgerEvidenceRefSchema).default([]),
  tags: z.array(z.string()).default([]),
  case_id: z.string().optional(),
  provenance: z.object({
    source: z.string(),
    timestamp: z.string().datetime(),
    validation_steps: z.array(ValidationStepSchema),
  }),
  seal: z
    .object({
      proven: z.boolean(),
      explainable: z.boolean(),
      legally_executable: z.boolean(),
      sealed_at: z.string().datetime().optional(),
      sealed_by: z.string().optional(),
    })
    .optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const CaseStrategySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  goal: z.string().min(1),
  focus_hypothesis_ids: z.array(z.string().uuid()).default([]),
  working_premise_ids: z.array(z.string().uuid()).default([]),
  next_intentional_move: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CaseStrategy = z.infer<typeof CaseStrategySchema>;

export const LedgerEnvelopeSchema = z.object({
  schema_version: z.literal('0.1.0'),
  belt_version: z.string().min(1),
  cases: z.array(CaseStrategySchema).default([]),
  hypotheses: z.array(HypothesisSchema),
  audit_trail: z.array(z.string()).default([]),
});
export type LedgerEnvelope = z.infer<typeof LedgerEnvelopeSchema>;

export const UpsertCaseRequestSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(3),
    goal: z.string().min(1),
    focus_hypothesis_ids: z.array(z.string().uuid()).optional(),
    working_premise_ids: z.array(z.string().uuid()).optional(),
    next_intentional_move: z.string().optional(),
  })
  .strict();
export type UpsertCaseRequest = z.infer<typeof UpsertCaseRequestSchema>;

export const CreateHypothesisRequestSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(3),
    claim: z.string().min(1),
    lane: HypothesisSchema.shape.lane,
    disposition: HypothesisSchema.shape.disposition,
    confidence: z.number().min(0).max(1),
    tags: z.array(z.string()).optional(),
    case_id: z.string().optional(),
    source: z.string().min(1),
  })
  .strict();
export type CreateHypothesisRequest = z.infer<typeof CreateHypothesisRequestSchema>;

export const AttachEvidenceRequestSchema = LedgerEvidenceRefSchema.strict();
export type AttachEvidenceRequest = z.infer<typeof AttachEvidenceRequestSchema>;

export const AdvanceLaneRequestSchema = z
  .object({
    toLane: HypothesisSchema.shape.lane,
    seal: z
      .object({
        proven: z.boolean(),
        explainable: z.boolean(),
        legally_executable: z.boolean(),
      })
      .optional(),
    actor: z.string().optional(),
  })
  .strict();
export type AdvanceLaneRequest = z.infer<typeof AdvanceLaneRequestSchema>;

export const QueryLedgerRequestSchema = z
  .object({
    mode: z.enum(['counsel', 'private_commerce']),
    tags: z.array(z.string()).optional(),
    caseId: z.string().optional(),
    q: z.string().optional(),
    includeParked: z.boolean().optional(),
  })
  .strict();
export type QueryLedgerRequest = z.infer<typeof QueryLedgerRequestSchema>;

export const ExportLedgerQuerySchema = z
  .object({
    caseId: z.string().optional(),
  })
  .strict();
export type ExportLedgerQuery = z.infer<typeof ExportLedgerQuerySchema>;

export function assertCurrentBeltVersion(envelope: { belt_version: string }): void {
  if (envelope.belt_version !== LEDGER_BELT_VERSION) {
    throw new Error(
      `Rejected ledger envelope: belt_version ${envelope.belt_version} != ${LEDGER_BELT_VERSION}`,
    );
  }
}
