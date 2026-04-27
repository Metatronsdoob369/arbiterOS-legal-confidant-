/**
 * ⚖️ Legal Schemas — The Chastity Belt
 * 
 * These Zod schemas define the EXACT shape of every legal data structure
 * the AI is allowed to read, produce, and reason about.
 * 
 * The AI does NOT interpret law. It reads structured, schema-validated data
 * returned by the legal engine. If it ain't in the schema, it ain't real.
 * 
 * "Contracts > Prompts" — Domicile Architecture DNA
 */

import { z } from 'zod';

// ═══════════════════════════════════════════
// STATUTE & LAW LIBRARY SCHEMAS
// ═══════════════════════════════════════════

export const StatuteSchema = z.object({
  title: z.string().describe('Human-readable statute title'),
  source: z.string().describe('Official citation (e.g. "UCC § 3-104")'),
  text: z.string().describe('Verbatim statutory text — the Source of Truth'),
});
export type Statute = z.infer<typeof StatuteSchema>;

export const StatuteLookupResultSchema = z.object({
  found: z.boolean(),
  title: z.string().optional(),
  text: z.string().optional(),
  citation: z.string().optional(),
});
export type StatuteLookupResult = z.infer<typeof StatuteLookupResultSchema>;

// ═══════════════════════════════════════════
// VALIDATION STEP — The Atomic Unit of Proof
// ═══════════════════════════════════════════

export const ValidationStepSchema = z.object({
  rule_id: z.string().describe('Identifier of the rule being checked'),
  passed: z.boolean().describe('Whether the check passed'),
  details: z.string().describe('Human-readable explanation of the result'),
  evidence_source: z.string().describe('Where the evidence came from'),
  timestamp: z.string().describe('ISO 8601 timestamp of the check'),
  generated_content: z.string().optional().describe('Generated form markdown if applicable'),
});
export type ValidationStep = z.infer<typeof ValidationStepSchema>;

// ═══════════════════════════════════════════
// INSTRUMENT TERMS (UCC 3-104)
// ═══════════════════════════════════════════

export const InstrumentTermsSchema = z.object({
  promise_type: z.enum(['conditional', 'unconditional']).describe('Nature of the promise'),
  amount_type: z.enum(['fixed', 'variable']).describe('Whether the amount is fixed or variable'),
  currency: z.string().optional().default('USD'),
  payable_to: z.enum(['bearer', 'order', 'specific_person']).describe('Who the instrument is payable to'),
  timing: z.enum(['demand', 'definite', 'indefinite']).describe('Payment timing'),
  other_undertakings: z.boolean().describe('Whether there are undertakings beyond payment'),
});
export type InstrumentTerms = z.infer<typeof InstrumentTermsSchema>;

// ═══════════════════════════════════════════
// TAX VERIFICATION (IRC 162(a))
// ═══════════════════════════════════════════

export const ExpenseVerificationSchema = z.object({
  naics_code: z.string().min(2).describe('NAICS industry code'),
  expense_item: z.string().min(1).describe('Description of the expense'),
});

export const ExpenseRatioSchema = z.object({
  expense_amount: z.number().positive().describe('Cost of the expense in USD'),
  business_revenue: z.number().positive().describe('Total annual gross revenue in USD'),
});

// ═══════════════════════════════════════════
// CONTRACT RISK ANALYSIS
// ═══════════════════════════════════════════

export const ClauseAnalysisSchema = z.object({
  clause_text: z.string().min(1).describe('Verbatim text of the clause to analyze'),
  doc_type: z.string().min(1).describe('Type of document (e.g. service_contract, license, loan)'),
});

// ═══════════════════════════════════════════
// FORM GENERATION
// ═══════════════════════════════════════════

export const FormGenerationSchema = z.object({
  form_type: z.enum([
    'promissory_note_ucc',
    'security_agreement_ucc',
    'bill_of_sale_ucc',
    'contractor_agreement',
  ]).describe('Type of legal form to generate'),
  amount: z.number().optional(),
  lender: z.string().optional(),
  borrower: z.string().optional(),
  seller: z.string().optional(),
  buyer: z.string().optional(),
  client: z.string().optional(),
  contractor: z.string().optional(),
  collateral: z.string().optional(),
  goods_description: z.string().optional(),
  services: z.string().optional(),
  date: z.string().optional(),
  state: z.string().optional(),
});
export type FormGenerationInput = z.infer<typeof FormGenerationSchema>;

// ═══════════════════════════════════════════
// AI RESPONSE CONTRACTS (What the AI gives back)
// ═══════════════════════════════════════════

export const AuditScoreSchema = z.object({
  score: z.number().min(0).max(1).describe('Compliance score from 0.0 to 1.0'),
  critique: z.string().describe('Short audit notes on the response quality'),
});
export type AuditScore = z.infer<typeof AuditScoreSchema>;

export const ChatResponseSchema = z.object({
  text: z.string().describe('The AI response text'),
  audioData: z.instanceof(Uint8Array).optional().describe('PCM audio data for TTS'),
});

// ═══════════════════════════════════════════
// VALIDATION GATE CONTRACTS
// Contracts > Prompts: gate validates claims deterministically.
// "If it ain't in the schema, it ain't real." — and now,
// if it ain't backed by evidence, it ain't leaving the gate.
// ═══════════════════════════════════════════

/**
 * A single evidence reference backing an AI claim.
 * Ties every assertion to a verifiable source.
 */
export const EvidenceRefSchema = z.object({
  kind: z.enum(['statute', 'library_item', 'evidence_node', 'tool_result', 'url'])
    .describe('Category of evidence source'),
  ref: z.string().describe('Identifier or URL for the evidence source (e.g. "UCC 3-104", item ID, URL)'),
  quote: z.string().optional().describe('Verbatim excerpt from the source that supports the claim'),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

/**
 * An atomic claim extracted from the AI draft response.
 * Each claim must declare its kind, severity, and supporting evidence.
 * The gate validates claims deterministically — no model calls required.
 */
export const ClaimSchema = z.object({
  id: z.string().describe('Unique claim identifier within the response (e.g. "c1", "c2")'),
  text: z.string().describe('The atomic claim being made'),
  kind: z.enum(['fact', 'legal_rule', 'interpretation', 'instruction', 'speculation'])
    .describe('Type of claim: fact/legal_rule require evidence; interpretation/speculation require explicit labeling'),
  severity: z.enum(['low', 'medium', 'high']).default('medium')
    .describe('Risk severity if this claim is wrong: high = hard block or repair required'),
  evidence: z.array(EvidenceRefSchema).default([])
    .describe('Supporting evidence references; fact/legal_rule claims must have at least one'),
});
export type Claim = z.infer<typeof ClaimSchema>;

/**
 * The structured draft response produced by Arbiter before the gate processes it.
 * Separates the user-facing text from the machine-readable claim ledger.
 */
export const DraftResponseSchema = z.object({
  draft_text: z.string().describe('The AI-drafted response text (markdown, with [CITATION:] and [SIGNATURE_FIELD:] tags as usual)'),
  claims: z.array(ClaimSchema).describe('Atomic claims made in the draft; gate validates each one'),
  style: z.object({
    brevity: z.enum(['terse', 'normal', 'verbose']).optional(),
    tone: z.enum(['sardonic', 'professional', 'blunt']).optional(),
  }).optional().describe('Persona style hints for repair rounds'),
});
export type DraftResponse = z.infer<typeof DraftResponseSchema>;

/**
 * A single claim that failed gate validation, with the reason.
 */
export const FailedClaimSchema = z.object({
  claim_id: z.string().describe('ID of the claim that failed'),
  reason: z.string().describe('Human-readable explanation of why the claim failed'),
});
export type FailedClaim = z.infer<typeof FailedClaimSchema>;

/**
 * The final gate decision after validating a DraftResponse.
 * - pass: all claims verified; draft ships unchanged.
 * - soften: low/medium claims unsupported; gate adds uncertainty markers.
 * - block: high-severity failures; response replaced with verification-mode message.
 * - repair_request: fixable failures (e.g. unlabeled interpretation); one repair round runs.
 */
export const GateDecisionSchema = z.object({
  decision: z.enum(['pass', 'soften', 'block', 'repair_request'])
    .describe('Gate outcome determining what reaches the user'),
  final_text: z.string().describe('User-facing response text after gate processing; may differ from draft_text'),
  failed_claims: z.array(FailedClaimSchema).describe('Claims that failed validation with reasons'),
  validation_steps: z.array(ValidationStepSchema).describe('Audit trail of every gate check performed'),
  audit: AuditScoreSchema.optional().describe('Optional compliance score summary'),
});
export type GateDecision = z.infer<typeof GateDecisionSchema>;

// ═══════════════════════════════════════════
// LIBRARY ITEMS (User's knowledge base)
// ═══════════════════════════════════════════

export const LibraryItemSchema = z.object({
  id: z.string(),
  type: z.enum(['quote', 'statute', 'article', 'book', 'paper', 'snippet', 'note']),
  title: z.string(),
  content: z.string(),
  source: z.string().optional(),
  citation: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  pinned: z.boolean().default(false),
});
export type LibraryItem = z.infer<typeof LibraryItemSchema>;

// ═══════════════════════════════════════════
// EVIDENCE BOARD NODE (Whiteboard)
// ═══════════════════════════════════════════

export const EvidenceNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['evidence', 'witness', 'statute', 'argument', 'document', 'timeline']),
  content: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
});
export type EvidenceNode = z.infer<typeof EvidenceNodeSchema>;

export const EvidenceConnectionSchema = z.object({
  id: z.string(),
  from: z.string().describe('Source node ID'),
  to: z.string().describe('Target node ID'),
  label: z.string().optional(),
  strength: z.enum(['strong', 'moderate', 'weak']).default('moderate'),
});
export type EvidenceConnection = z.infer<typeof EvidenceConnectionSchema>;

// ═══════════════════════════════════════════
// PROVIDER CONFIG (De-Googled AI Backend)
// ═══════════════════════════════════════════

export const AIProviderConfigSchema = z.object({
  provider: z.enum(['openai', 'ollama', 'openrouter', 'custom']).default('openai'),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string().default('gpt-4o'),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.3),
});
export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;
