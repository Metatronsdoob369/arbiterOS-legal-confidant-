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
// FORM GENERATION (discriminated by form_type)
// ═══════════════════════════════════════════

const FormBaseFields = {
  date: z.string().optional(),
  state: z.string().optional(),
};

export const PromissoryNoteFormSchema = z.object({
  form_type: z.literal('promissory_note_ucc'),
  amount: z.number().positive(),
  lender: z.string().trim().min(1),
  borrower: z.string().trim().min(1),
  ...FormBaseFields,
});

export const SecurityAgreementFormSchema = z.object({
  form_type: z.literal('security_agreement_ucc'),
  collateral: z.string().trim().min(4),
  debtor: z.string().trim().min(1).optional(),
  secured_party: z.string().trim().min(1).optional(),
  obligation: z.string().optional(),
  ...FormBaseFields,
});

export const BillOfSaleFormSchema = z.object({
  form_type: z.literal('bill_of_sale_ucc'),
  seller: z.string().trim().min(1),
  buyer: z.string().trim().min(1),
  amount: z.number().positive().optional(),
  goods_description: z.string().trim().min(1),
  ...FormBaseFields,
});

export const ContractorAgreementFormSchema = z.object({
  form_type: z.literal('contractor_agreement'),
  client: z.string().trim().min(1),
  contractor: z.string().trim().min(1),
  services: z.string().trim().min(1),
  ...FormBaseFields,
});

export const NdaFormSchema = z.object({
  form_type: z.literal('nda'),
  disclosing_party: z.string().trim().min(1),
  receiving_party: z.string().trim().min(1),
  purpose: z.string().trim().min(3),
  term_years: z.number().positive().max(50),
  mutual: z.boolean().optional().default(true),
  ...FormBaseFields,
});

export const ServiceAgreementFormSchema = z.object({
  form_type: z.literal('service_agreement'),
  client: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  services: z.string().trim().min(3),
  fee: z.number().nonnegative().optional(),
  payment_terms: z.string().trim().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  ...FormBaseFields,
});

export const ConsultingAgreementFormSchema = z.object({
  form_type: z.literal('consulting_agreement'),
  client: z.string().trim().min(1),
  consultant: z.string().trim().min(1),
  scope: z.string().trim().min(3),
  fee: z.number().nonnegative().optional(),
  retainer: z.number().nonnegative().optional(),
  deliverables: z.string().trim().min(1).optional(),
  ...FormBaseFields,
});

export const IpAssignmentFormSchema = z.object({
  form_type: z.literal('ip_assignment'),
  assignor: z.string().trim().min(1),
  assignee: z.string().trim().min(1),
  work_description: z.string().trim().min(3),
  consideration: z.string().trim().min(1).optional(),
  effective_date: z.string().optional(),
  ...FormBaseFields,
});

export const FormGenerationSchema = z.discriminatedUnion('form_type', [
  PromissoryNoteFormSchema,
  SecurityAgreementFormSchema,
  BillOfSaleFormSchema,
  ContractorAgreementFormSchema,
  NdaFormSchema,
  ServiceAgreementFormSchema,
  ConsultingAgreementFormSchema,
  IpAssignmentFormSchema,
]);
export type FormGenerationInput = z.infer<typeof FormGenerationSchema>;
export type PromissoryNoteFormInput = z.infer<typeof PromissoryNoteFormSchema>;
export type SecurityAgreementFormInput = z.infer<typeof SecurityAgreementFormSchema>;
export type BillOfSaleFormInput = z.infer<typeof BillOfSaleFormSchema>;
export type ContractorAgreementFormInput = z.infer<typeof ContractorAgreementFormSchema>;
export type NdaFormInput = z.infer<typeof NdaFormSchema>;
export type ServiceAgreementFormInput = z.infer<typeof ServiceAgreementFormSchema>;
export type ConsultingAgreementFormInput = z.infer<typeof ConsultingAgreementFormSchema>;
export type IpAssignmentFormInput = z.infer<typeof IpAssignmentFormSchema>;

// ═══════════════════════════════════════════
// DOCUMENT DRAFT / WORD EXPORT CONTRACTS
// Provenance slots reserved for spectral / CourtListener later.
// ═══════════════════════════════════════════

export const DocumentCitationSchema = z.object({
  label: z.string(),
  citation: z.string(),
  url: z.string().optional(),
  quote: z.string().optional(),
});
export type DocumentCitation = z.infer<typeof DocumentCitationSchema>;

export const DocumentHoldingRefSchema = z.object({
  holding_id: z.string(),
  court: z.string().optional(),
  decision_date: z.string().optional(),
  citation: z.string(),
  text: z.string(),
});
export type DocumentHoldingRef = z.infer<typeof DocumentHoldingRefSchema>;

export const DocumentSourceRefSchema = z.object({
  kind: z.enum(['statute', 'opinion', 'docket', 'filing', 'library_item', 'url']),
  ref: z.string(),
  label: z.string().optional(),
});
export type DocumentSourceRef = z.infer<typeof DocumentSourceRefSchema>;

export const DocumentProvenanceSchema = z.object({
  citations: z.array(DocumentCitationSchema).default([]),
  holdings: z.array(DocumentHoldingRefSchema).default([]),
  source_refs: z.array(DocumentSourceRefSchema).default([]),
});
export type DocumentProvenance = z.infer<typeof DocumentProvenanceSchema>;

export const DocumentDraftSchema = z.object({
  id: z.string(),
  form: FormGenerationSchema,
  markdown: z.string(),
  validation_steps: z.array(ValidationStepSchema),
  passed: z.boolean(),
  provenance: DocumentProvenanceSchema.default({
    citations: [],
    holdings: [],
    source_refs: [],
  }),
  created_at: z.string(),
});
export type DocumentDraft = z.infer<typeof DocumentDraftSchema>;

export const DocumentExportRequestSchema = z.union([
  z.object({
    draft_id: z.string().min(1),
    format: z.literal('docx'),
  }).strict(),
  z.object({
    draft: DocumentDraftSchema,
    format: z.literal('docx'),
  }).strict(),
]);
export type DocumentExportRequest = z.infer<typeof DocumentExportRequestSchema>;

export const DocumentExportResultSchema = z.object({
  draft_id: z.string(),
  processed_file_id: z.string(),
  filename: z.string(),
  mime_type: z.literal('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  size_bytes: z.number().int().nonnegative(),
  checksum: z.string(),
  artifact_path: z.string(),
});
export type DocumentExportResult = z.infer<typeof DocumentExportResultSchema>;

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
  kind: z.enum(['statute', 'holding', 'library_item', 'evidence_node', 'tool_result', 'url', 'register_sense'])
    .describe('Category of evidence source'),
  ref: z.string().describe('Identifier or URL for the evidence source (e.g. "UCC 3-104", item ID, URL)'),
  quote: z.string().optional().describe('Verbatim excerpt from the source that supports the claim'),
  strength: z.enum(['weak', 'moderate', 'strong']).optional()
    .describe('Relative evidentiary force when the source is a holding or tool result'),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

// ═══════════════════════════════════════════
// REGISTER MIRROR (Private Confidant Lexicon)
// Plain English ↔ institutional / statutory senses.
// ═══════════════════════════════════════════

export const RegisterEpistemicSchema = z.enum(['settled', 'institutional', 'plain', 'contested']);
export const RegisterBandSchema = z.enum([
  'plain',
  'institutional',
  'statute',
  'fiscal',
  'capacity',
  'contested',
]);
export const RegisterMatrixSchema = z.enum([
  'money_credit',
  'private_public_lien',
  'identity_split',
  'procedural',
  'discharge',
  'capacity',
  'fiscal',
]);

export const RegisterSenseSchema = z.object({
  register: RegisterBandSchema,
  epistemic: RegisterEpistemicSchema,
  definition: z.string().min(1),
  authority_cite: z.string().min(1),
  source_refs: z.array(z.string()).default([]),
}).strict();
export type RegisterSense = z.infer<typeof RegisterSenseSchema>;

export const RegisterEntrySchema = z.object({
  term_id: z.string().min(1),
  surface_forms: z.array(z.string().min(1)).min(1),
  matrix: RegisterMatrixSchema.optional(),
  senses: z.array(RegisterSenseSchema).min(1),
  confusion_with: z.array(z.string()).default([]),
  mirror_hint: z.string().min(1),
  procedural_triggers: z.array(z.string()).default([]),
}).strict();
export type RegisterEntry = z.infer<typeof RegisterEntrySchema>;

export const RegisterLexiconSchema = z.object({
  schema_version: z.literal('0.1.0'),
  lexicon_id: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  entries: z.array(RegisterEntrySchema).min(1),
}).strict();
export type RegisterLexicon = z.infer<typeof RegisterLexiconSchema>;

export const RegisterTranslateRequestSchema = z.object({
  text: z.string().trim().min(1).max(8000),
}).strict();
export type RegisterTranslateRequest = z.infer<typeof RegisterTranslateRequestSchema>;

export const RegisterMatchedTermSchema = z.object({
  term_id: z.string(),
  surface: z.string(),
  user_usage_echo: z.string(),
  matrix: RegisterMatrixSchema.optional(),
  plain_sense: RegisterSenseSchema.optional(),
  senses_by_band: z.object({
    settled: z.array(RegisterSenseSchema),
    institutional: z.array(RegisterSenseSchema),
    contested: z.array(RegisterSenseSchema),
  }),
  confusion_notes: z.array(z.string()),
  procedural_reminders: z.array(z.string()),
  mirror_hint: z.string(),
  posture: z.literal('mirror_then_distinguish'),
}).strict();
export type RegisterMatchedTerm = z.infer<typeof RegisterMatchedTermSchema>;

export const RegisterMirrorResultSchema = z.object({
  matched_terms: z.array(RegisterMatchedTermSchema),
  unanswered_spans: z.array(z.string()),
  provenance: z.object({
    lexicon_id: z.string(),
    lexicon_version: z.string(),
    source_path: z.string(),
    source_refs: z.array(z.string()),
  }).strict(),
}).strict();
export type RegisterMirrorResult = z.infer<typeof RegisterMirrorResultSchema>;

/** Capture → propose → human merge. Never silent-write the live pack. */
export const RegisterProposalModeSchema = z.enum(['create', 'amend']);
export const RegisterProposalStatusSchema = z.enum(['pending', 'merged', 'rejected']);

export const RegisterProposeRequestSchema = z.object({
  trigger_text: z.string().trim().min(1).max(8000),
  notes: z.string().trim().max(4000).optional(),
  mode: RegisterProposalModeSchema.default('create'),
  entry: RegisterEntrySchema,
}).strict();
export type RegisterProposeRequest = z.infer<typeof RegisterProposeRequestSchema>;

/** Quick research — clarity before propose. Case/orthography aware. */
export const RegisterResearchRequestSchema = z.object({
  term: z.string().trim().min(1).max(512),
  context: z.string().trim().max(4000).optional(),
  corpus_hint: z.string().trim().max(128).optional(),
}).strict();
export type RegisterResearchRequest = z.infer<typeof RegisterResearchRequestSchema>;

export const RegisterResearchHitSchema = z.object({
  term_id: z.string(),
  surface_forms: z.array(z.string()),
  exact_case_match: z.boolean(),
  matrix: RegisterMatrixSchema.optional(),
  mirror_hint: z.string(),
  senses_by_band: z.object({
    settled: z.array(RegisterSenseSchema),
    institutional: z.array(RegisterSenseSchema),
    contested: z.array(RegisterSenseSchema),
  }),
  confusion_notes: z.array(z.string()),
}).strict();
export type RegisterResearchHit = z.infer<typeof RegisterResearchHitSchema>;

export const RegisterResearchResultSchema = z.object({
  query_term: z.string(),
  context: z.string().optional(),
  corpus_hint: z.string().optional(),
  orthography: z.object({
    as_given: z.string(),
    lower: z.string(),
    title: z.string(),
    upper: z.string(),
    case_variants_differ: z.boolean(),
  }).strict(),
  in_lexicon: z.boolean(),
  hits: z.array(RegisterResearchHitSchema),
  case_gap: z.object({
    noted: z.boolean(),
    detail: z.string(),
  }).strict(),
  clarity_summary: z.string(),
  propose_ready: z.object({
    recommended: z.boolean(),
    mode: RegisterProposalModeSchema,
    suggested_term_id: z.string(),
    suggested_surface_forms: z.array(z.string()),
    stub_notes: z.string(),
  }).strict(),
  posture: z.literal('clarify_before_propose'),
  provenance: z.object({
    lexicon_id: z.string(),
    lexicon_version: z.string(),
    source_path: z.string(),
  }).strict(),
}).strict();
export type RegisterResearchResult = z.infer<typeof RegisterResearchResultSchema>;

export const RegisterProposalSchema = z.object({
  id: z.string().min(1),
  status: RegisterProposalStatusSchema,
  mode: RegisterProposalModeSchema,
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  trigger_text: z.string().min(1),
  notes: z.string().optional(),
  entry: RegisterEntrySchema,
  reject_reason: z.string().optional(),
  merged_into_version: z.string().optional(),
}).strict();
export type RegisterProposal = z.infer<typeof RegisterProposalSchema>;

export const EpistemicBandSchema = z.enum(['settled', 'institutional', 'contested', 'perilous']);
export type EpistemicBand = z.infer<typeof EpistemicBandSchema>;

export const PackageFormRefSchema = z.object({
  form_id: z.string().min(1),
  title: z.string().min(1),
  official_url: z.string().url().optional(),
  sensitivity: z.enum(['common', 'sparse', 'sensitive']).optional(),
}).strict();

export const PackageLineSchema = z.object({
  line_id: z.string().min(1),
  text: z.string().min(1),
  register_ref: z.string().optional(),
}).strict();

export const PackageStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  forms: z.array(PackageFormRefSchema).default([]),
  lines: z.array(PackageLineSchema).default([]),
  evidence_hooks: z.array(z.object({
    kind: z.string().min(1),
    ref: z.string().min(1),
  }).strict()).optional(),
  speed_bumps: z.array(z.string()).default([]),
  flags: z.array(z.string()).default([]),
  epistemic: EpistemicBandSchema,
  delivery: z.object({
    method: z.string().optional(),
    destination: z.string().optional(),
  }).strict().optional(),
}).strict();

export const PrimerPackageSchema = z.object({
  package_id: z.string().min(1),
  title: z.string().min(1),
  outcome: z.string().min(1),
  course_kind: z.enum(['primer', 'advanced']),
  steps: z.array(PackageStepSchema).min(1),
  source_notebooks: z.array(z.string()).optional(),
  vector_ready: z.boolean().default(false),
}).strict();
export type PrimerPackage = z.infer<typeof PrimerPackageSchema>;
export type PackageStep = z.infer<typeof PackageStepSchema>;

// ═══════════════════════════════════════════
// DOCS CATALOG (Documentation curate spine)
// ═══════════════════════════════════════════

export const DocsDepartmentIdSchema = z.enum([
  'irs_treasury',
  'fred_fed',
  'ucc',
  'cfr',
]);
export type DocsDepartmentId = z.infer<typeof DocsDepartmentIdSchema>;

export const DocsModuleStatusSchema = z.enum(['populated', 'stub']);
export type DocsModuleStatus = z.infer<typeof DocsModuleStatusSchema>;

export const DocsEntryKindSchema = z.enum([
  'form',
  'instruction',
  'publication',
  'other',
]);
export type DocsEntryKind = z.infer<typeof DocsEntryKindSchema>;

export const DocsCatalogRefSchema = z.object({
  catalog_id: z.string().min(1),
  title: z.string().min(1),
  status: DocsModuleStatusSchema,
  entry_count: z.number().int().nonnegative().default(0),
  source: z.string().optional(),
  description: z.string().optional(),
}).strict();
export type DocsCatalogRef = z.infer<typeof DocsCatalogRefSchema>;

export const DocsDepartmentModuleSchema = z.object({
  department_id: DocsDepartmentIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  status: DocsModuleStatusSchema,
  catalogs: z.array(DocsCatalogRefSchema).default([]),
}).strict();
export type DocsDepartmentModule = z.infer<typeof DocsDepartmentModuleSchema>;

export const DocsCatalogEntrySchema = z.object({
  entry_id: z.string().min(1),
  department_id: DocsDepartmentIdSchema,
  catalog_id: z.string().min(1),
  file_name: z.string().min(1),
  title: z.string().min(1),
  official_url: z.string().url(),
  kind: DocsEntryKindSchema,
  text_preview: z.string().default(''),
  source: z.string().min(1),
}).strict();
export type DocsCatalogEntry = z.infer<typeof DocsCatalogEntrySchema>;

export const DocsCatalogIndexSchema = z.object({
  catalog_id: z.string().min(1),
  department_id: DocsDepartmentIdSchema,
  title: z.string().min(1),
  source: z.string().min(1),
  ingested_at: z.string().min(1),
  entry_count: z.number().int().nonnegative(),
  entries: z.array(DocsCatalogEntrySchema),
}).strict();
export type DocsCatalogIndex = z.infer<typeof DocsCatalogIndexSchema>;

export const InterpretationLinkSchema = z.object({
  holding_id: z.string().describe('Resolved holding identifier returned by retrieve_holdings'),
  citation: z.string().describe('Holding citation or stable corpus label'),
  relation: z.enum(['supports', 'distinguishes', 'limits']).describe('How the holding bears on the claim'),
  strength: z.enum(['weak', 'moderate', 'strong']).default('moderate').describe('Weight assigned to the holding'),
  quote: z.string().optional().describe('Key holding language supporting the claim'),
});
export type InterpretationLink = z.infer<typeof InterpretationLinkSchema>;

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
  interpretation_links: z.array(InterpretationLinkSchema).default([])
    .describe('Common-law holding links supporting the claim; high-severity legal claims should carry at least one strong link'),
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
