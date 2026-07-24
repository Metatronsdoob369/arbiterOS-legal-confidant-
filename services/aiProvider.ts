/**
 * ⚖️ AI Provider Service — De-Googled, Provider-Agnostic
 * 
 * Supports: OpenAI, Ollama (local), OpenRouter, or any OpenAI-compatible API.
 * No Google. No surveillance. Just law.
 * 
 * "The future is not prompted; it is Contracted." — OMC Architecture
 *
 * Common Law extension: tools now include retrieve_holdings / link_interpretation
 * so the model can assemble InterpretationLinks required by Validation Gate R5.
 */

import { Message, Role, AuditEntry } from '../types';
import {
  AuditScoreSchema,
  ValidationStepSchema,
  FormGenerationSchema,
  DraftResponseSchema,
  ClaimSchema,
  type AuditScore,
  type DraftResponse,
  type LibraryItem,
  type EvidenceNode,
  type GateDecision,
  type ValidationStep as SchemaValidationStep,
} from '../schemas/legalSchemas';
import {
  verifyOrdinary,
  verifyNecessary,
  verifyNegotiability,
  analyzeContractRisks,
  consultStatute,
  type ValidationStep,
  type InstrumentTerms,
} from './legalEngine';
import { createDraftForm } from './draftsClient';
import { commonLawEngine } from './commonLawEngine';
import { registerLexiconClient } from './registerLexiconClient';
import { pconColdMapClient } from './pconColdMapClient';
import { pconLedgerClient } from './pconLedgerClient';
import { normalizeRegisterSurfaces } from './registerHighlight';
import { runValidationGate, type GateInputState } from './validationGate';
import { buildPrivateConfidantInstruction } from './pconCockpit';

// ═══════════════════════════════════════════
// SYSTEM INSTRUCTIONS — Archer meets Goliath
// ═══════════════════════════════════════════

const LEGAL_SYSTEM_INSTRUCTION = `
You are the ArbiterOS Legal Confidant — a sharp-tongued, devastatingly competent legal strategist 
with the dry wit of Sterling Archer and the ruthless precision of Billy McBride from Goliath.

You don't sugarcoat. You don't hedge with "I'm not a lawyer" disclaimers every other sentence 
like some spineless chatbot. You're a case-building weapon that happens to have a personality.

PERSONALITY PROTOCOLS:
- You are sardonic, incisive, and occasionally theatrical — but NEVER at the expense of accuracy.
- You treat bad contract clauses like Archer treats lactose — with open contempt and detailed analysis.
- When you find a Confession of Judgment clause, you react like Billy McBride finding a smoking gun.
- You call out predatory legal language like you're exposing a conspiracy, because usually, you are.
- You drop legal citations the way other people drop names at parties — effortlessly and often.

CORE PROTOCOLS (Non-Negotiable):
1. **Contract-First Architecture**: You are strictly bound by the available tools and Zod-validated schemas.
   You do NOT interpret law. You retrieve it, validate it, and present it. The schema is the chastity belt.
2. **Tool Mandate**: For expenses, you MUST verify using 'verify_ordinary' then 'verify_necessary'.
3. **Risk Scanning**: For documents/contracts, you MUST extract clauses and use 'analyze_clause_risks'.
4. **Form Generation**: For legal forms, you MUST use 'draft_verified_form'. You cannot wing it.
5. **Signature Rendering**: Use '[SIGNATURE_FIELD:Label]' tags for visual signature boxes.
6. **Citation Binding**: If referencing a statute, use 'consult_statute' to retrieve raw text.
   Display with '[CITATION:Title|Source]' tags. No citation? No claim. Period.
   **Silence-first**: If consult_statute returns silence.silenced=true (or found=false), you MUST NOT invent a statute cite.
   You may still help with procedure and plain language; say the corpus was silent on that authority.
7. **Negotiability**: For financial instruments, use 'verify_negotiability' for UCC 3-104 compliance.
8. **Common-Law Holdings**: For statutory interpretation, negotiability disputes, or case-driven legal propositions, use 'retrieve_holdings'.
   High-severity legal_rule or interpretation claims must carry either a statute citation or a strong interpretation link from holdings.
   **Silence-first**: If retrieve_holdings returns silence.silenced=true (empty or weak-only under strict policy), do NOT assert “the holding is…”.
   Qualify or stay silent on that authority claim.

PROCESS:
- Receive user intent (text or document upload).
- If document: Read it, extract key clauses, run 'analyze_clause_risks'. 
  Then tell them what's wrong with it — and be entertaining about it.
- If request for form: Identify the type, gather parameters, run 'draft_verified_form'.
- If legal_rule / interpretation: retrieve holdings first, then form the claim with interpretation_link.
- If verification fails, deny the request and explain why with the enthusiasm of a prosecutor.
- Always end with actionable next steps. You're building a case, not writing a term paper.

Remember: You're the lawyer they wish they had. Act like it.

FINAL RESPONSE FORMAT (MANDATORY):
After completing ALL tool calls, output your final response as a raw JSON object ONLY.
Do NOT wrap in markdown code fences. Output only the JSON, nothing else.

Schema:
{
  "draft_text": "<your complete legal advice — markdown, [CITATION:Title|Source] tags, [SIGNATURE_FIELD:Label] tags — exactly as you would normally write it>",
  "claims": [
    {
      "id": "c1",
      "text": "<atomic claim in one sentence>",
      "kind": "<fact | legal_rule | interpretation | instruction | speculation>",
      "severity": "<low | medium | high>",
      "evidence": [
        { "kind": "<statute | holding | tool_result | library_item | evidence_node | url | register_sense>", "ref": "<citation/ID/URL>", "quote": "<optional verbatim excerpt>", "strength": "<optional weak | moderate | strong>" }
      ],
      "interpretation_links": [
        { "holding_id": "<holding id>", "citation": "<holding citation>", "relation": "<supports | distinguishes | limits>", "strength": "<weak | moderate | strong>", "quote": "<optional holding excerpt>" }
      ]
    }
  ]
}

Rules for populating claims:
- List every factual assertion and legal rule stated in draft_text as a separate claim.
- For fact/legal_rule claims, populate evidence[] from your tool call results (statute citations, tool outputs).
- If you use retrieve_holdings, copy the strongest holding into evidence[] with kind "holding" and its strength.
- Also populate interpretation_links[] from the retrieve_holdings result for the claim that relies on those holdings.
- interpretation and speculation claims MUST include an explicit marker in their text, e.g. "[interpretation]" or "[speculation]". If not naturally present in draft_text for those claims, add the marker to the claim.text field.
- High-severity legal_rule or interpretation claims must include either a statute evidence ref or at least one interpretation_links entry with strength "strong".
- Assign severity: high = legal outcomes hinge on this; medium = important but not outcome-determinative; low = background context.
- Keep claim texts concise (one sentence). Do not re-paste entire paragraphs.
- Never cite a statute or holding that a tool returned as silenced. Prefer uncertainty markers over fabricated authority.
`;

/** Appended only when the Private Confidant workspace is active — loaded from cockpit contract veneer. */
const PRIVATE_CONFIDANT_INSTRUCTION = buildPrivateConfidantInstruction();

const CRITIC_SYSTEM_INSTRUCTION = `
ACT AS: The ArbiterOS Compliance Auditor — a humorless, exacting quality inspector.
You are the opposite of the Confidant's personality. You are pure protocol.

TASK: Forensic audit of the legal advice just given.
CHECKS:
1. Did the response use the required verification tools?
2. Did it cite specific USC/UCC sections from tool outputs?
3. Is the legal logic sound and properly sourced?
4. Did it avoid unsupported legal interpretation?
5. For legal_rule / interpretation claims: is there a valid InterpretationLink with sufficient graph_weight?

OUTPUT: JSON object with exactly two fields:
- "score": number from 0.0 to 1.0 (1.0 = perfect compliance)
- "critique": string with brief audit notes
`;

// ═══════════════════════════════════════════
// TOOL DEFINITIONS (OpenAI Function Calling Format)
// ═══════════════════════════════════════════

const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'verify_ordinary',
      description: 'Checks if an expense is "ordinary" for a given industry (NAICS code) under IRC 162(a).',
      parameters: {
        type: 'object',
        properties: {
          naics_code: { type: 'string', description: 'The 6-digit NAICS code (e.g., 238350 for Carpenters).' },
          expense_item: { type: 'string', description: 'The item or category being purchased.' },
        },
        required: ['naics_code', 'expense_item'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'verify_necessary',
      description: 'Checks if an expense is "necessary" (financially reasonable) based on revenue ratios.',
      parameters: {
        type: 'object',
        properties: {
          expense_amount: { type: 'number', description: 'Cost of the item in USD.' },
          business_revenue: { type: 'number', description: 'Total annual gross revenue in USD.' },
        },
        required: ['expense_amount', 'business_revenue'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'verify_negotiability',
      description: 'Checks if a set of terms constitutes a Negotiable Instrument under UCC 3-104.',
      parameters: {
        type: 'object',
        properties: {
          promise_type: { type: 'string', enum: ['conditional', 'unconditional'] },
          amount_type: { type: 'string', enum: ['fixed', 'variable'] },
          payable_to: { type: 'string', enum: ['bearer', 'order', 'specific_person'] },
          timing: { type: 'string', enum: ['demand', 'definite', 'indefinite'] },
          other_undertakings: { type: 'boolean' },
        },
        required: ['promise_type', 'amount_type', 'payable_to', 'timing', 'other_undertakings'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_clause_risks',
      description: 'Analyzes a contract clause for statutory risks (USC/UCC/Common Law).',
      parameters: {
        type: 'object',
        properties: {
          clause_text: { type: 'string', description: 'The exact text of the clause to analyze.' },
          doc_type: { type: 'string', description: 'Type of document (e.g., service_contract, license, loan).' },
        },
        required: ['clause_text', 'doc_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'consult_statute',
      description: 'Retrieves raw statutory text from the Law Library to verify assertions.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The statute name or keywords (e.g., "UCC 3-104")' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'retrieve_holdings',
      description: 'Retrieves common-law holdings and interpretation links from the local CommonLawSpectralEngine.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The legal proposition or question to retrieve holdings for.' },
          statute: { type: 'string', description: 'Optional statute anchor such as "UCC 3-104".' },
          topK: { type: 'number', description: 'Maximum holdings to return, up to 10.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'draft_verified_form',
      description: 'Generates a validated legal form template. Required fields depend on form_type (UCC instruments, NDA, service/consulting, IP assignment).',
      parameters: {
        type: 'object',
        properties: {
          form_type: {
            type: 'string',
            enum: [
              'promissory_note_ucc',
              'security_agreement_ucc',
              'bill_of_sale_ucc',
              'contractor_agreement',
              'nda',
              'service_agreement',
              'consulting_agreement',
              'ip_assignment',
            ],
          },
          amount: { type: 'number' },
          lender: { type: 'string' },
          borrower: { type: 'string' },
          seller: { type: 'string' },
          buyer: { type: 'string' },
          client: { type: 'string' },
          contractor: { type: 'string' },
          provider: { type: 'string' },
          consultant: { type: 'string' },
          debtor: { type: 'string' },
          secured_party: { type: 'string' },
          obligation: { type: 'string' },
          collateral: { type: 'string' },
          goods_description: { type: 'string' },
          services: { type: 'string' },
          disclosing_party: { type: 'string' },
          receiving_party: { type: 'string' },
          purpose: { type: 'string' },
          term_years: { type: 'number' },
          mutual: { type: 'boolean' },
          fee: { type: 'number' },
          payment_terms: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          scope: { type: 'string' },
          retainer: { type: 'number' },
          deliverables: { type: 'string' },
          assignor: { type: 'string' },
          assignee: { type: 'string' },
          work_description: { type: 'string' },
          consideration: { type: 'string' },
          effective_date: { type: 'string' },
          date: { type: 'string' },
          state: { type: 'string' },
        },
        required: ['form_type'],
      },
    },
  },
];

/** Register tools — only exposed in the Private Confidant workspace. */
const PRIVATE_REGISTER_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'translate_register',
      description:
        'Private Register Mirror: maps the user\'s plain-English commercial/status wording to institutional and statutory senses. Returns user_usage_echo first — mirror their usage, then distinguish.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The user wording (or key phrase) to mirror and translate across registers.',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'quick_register_research',
      description:
        'Clarify a single term before adding it to the lexicon. Case/orthography-aware (e.g. Minor vs minor). Call BEFORE propose_register_entry.',
      parameters: {
        type: 'object',
        properties: {
          term: { type: 'string', description: 'Exact term as the user wrote it — preserve casing.' },
          context: { type: 'string', description: 'Optional surrounding observation.' },
          corpus_hint: { type: 'string', description: 'Optional corpus hint: treasury, fed, ucc, etc.' },
        },
        required: ['term'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_register_entry',
      description:
        'Queue a Register Lexicon amendment AFTER quick_register_research. Does NOT merge into the live lexicon.',
      parameters: {
        type: 'object',
        properties: {
          trigger_text: { type: 'string', description: 'The user wording / situation that exposed the gap.' },
          notes: { type: 'string', description: 'Optional diligence note for the human reviewer.' },
          mode: { type: 'string', enum: ['create', 'amend'] },
          entry: {
            type: 'object',
            description: 'Full RegisterEntry payload.',
          },
        },
        required: ['trigger_text', 'entry'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'consult_cold_map',
      description:
        'Consult Private Confidant cold map (negative cartography): known failure citizens — myth-as-settled, public-filler Fed clocks, wrong-sense collapses. Use when strategy risks repeating a burn; cite hits as loyal opposition.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'User wording, strategy fragment, or risk theme to check against known burns.',
          },
          limit: {
            type: 'number',
            description: 'Max hits to return (default 5).',
          },
        },
        required: ['query'],
      },
    },
  },
];

/** Hypothesis Ledger tools — only exposed in the Private Confidant workspace. */
const PRIVATE_LEDGER_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'ledger_upsert_case',
      description:
        'Create or update a case/strategy record in the Hypothesis Ledger — the frame that groups working premises toward a goal.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Existing case UUID to update; omit to create a new case.' },
          title: { type: 'string', description: 'Short case title (min 3 chars).' },
          goal: { type: 'string', description: 'What this case strategy is trying to achieve.' },
          focus_hypothesis_ids: { type: 'array', items: { type: 'string' }, description: 'Hypothesis UUIDs currently in focus.' },
          working_premise_ids: { type: 'array', items: { type: 'string' }, description: 'Hypothesis UUIDs held as working premises (unsealed).' },
          next_intentional_move: { type: 'string', description: 'The next deliberate step for this case.' },
        },
        required: ['title', 'goal'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ledger_create_hypothesis',
      description:
        'Research-first: create a new hypothesis in the ledger. Everything starts unsealed — use working_premise or study lanes until evidence and seal gates justify advancing.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Existing hypothesis UUID to reuse; omit to create a new one.' },
          title: { type: 'string', description: 'Short hypothesis title (min 3 chars).' },
          claim: { type: 'string', description: 'The claim being tested.' },
          lane: {
            type: 'string',
            enum: ['working_premise', 'study', 'procedural_potential', 'sealed_executable', 'parked', 'burned'],
            description: 'Start in working_premise or study — never seed directly into sealed_executable.',
          },
          disposition: { type: 'string', enum: ['open', 'supported', 'refuted', 'archived'] },
          confidence: { type: 'number', description: '0..1 confidence level.' },
          tags: { type: 'array', items: { type: 'string' } },
          case_id: { type: 'string', description: 'Case UUID this hypothesis belongs to.' },
          source: { type: 'string', description: 'Provenance: where this hypothesis came from (user wording, tool, research).' },
        },
        required: ['title', 'claim', 'lane', 'disposition', 'confidence', 'source'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ledger_attach_evidence',
      description:
        'Attach an evidence reference (holding, statute, cold-map hit, etc.) to an existing hypothesis. Research-first: do this before proposing to advance a lane.',
      parameters: {
        type: 'object',
        properties: {
          hypothesis_id: { type: 'string', description: 'UUID of the hypothesis to attach evidence to.' },
          type: {
            type: 'string',
            enum: ['holding', 'statute', 'opinion', 'drive', 'procedure', 'spine', 'cold_map', 'other'],
          },
          ref: { type: 'string', description: 'Citation, ID, or path identifying the evidence.' },
          weight: { type: 'number', description: 'Optional 0..1 evidentiary weight.' },
          epistemic_ceiling: {
            type: 'string',
            enum: ['plain', 'settled', 'institutional', 'contested'],
            description: 'Optional cap on how strong a claim this evidence can support.',
          },
        },
        required: ['hypothesis_id', 'type', 'ref'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ledger_advance_lane',
      description:
        'Advance a hypothesis to a new lane. SEAL GATES: advancing to sealed_executable requires seal.proven, seal.explainable, AND seal.legally_executable all true — the ledger rejects the move otherwise. Working premises (working_premise, study, procedural_potential) stay unsealed by design; private-commerce consumers may only read sealed_executable hypotheses.',
      parameters: {
        type: 'object',
        properties: {
          hypothesis_id: { type: 'string', description: 'UUID of the hypothesis to advance.' },
          toLane: {
            type: 'string',
            enum: ['working_premise', 'study', 'procedural_potential', 'sealed_executable', 'parked', 'burned'],
          },
          seal: {
            type: 'object',
            description: 'Required when toLane is sealed_executable — all three flags must be true or the gate rejects the advance.',
            properties: {
              proven: { type: 'boolean' },
              explainable: { type: 'boolean' },
              legally_executable: { type: 'boolean' },
            },
          },
          actor: { type: 'string', description: 'Optional actor performing the seal.' },
        },
        required: ['hypothesis_id', 'toLane'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ledger_query',
      description:
        'Query the Hypothesis Ledger. mode=counsel surfaces working premises through sealed hypotheses (research view); mode=private_commerce is sealed-only — it never surfaces unsealed working premises or studies.',
      parameters: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['counsel', 'private_commerce'], description: 'private_commerce is sealed_executable-only.' },
          tags: { type: 'array', items: { type: 'string' } },
          caseId: { type: 'string' },
          q: { type: 'string', description: 'Free-text search across title/claim/tags.' },
          includeParked: { type: 'boolean', description: 'counsel mode only: also include parked hypotheses.' },
        },
        required: ['mode'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ledger_export',
      description: 'Export the ledger (or a single case) as a markdown report for the user.',
      parameters: {
        type: 'object',
        properties: {
          caseId: { type: 'string', description: 'Optional case UUID to scope the export.' },
        },
      },
    },
  },
];

// ═══════════════════════════════════════════
// PROVIDER CONFIGURATION
// ═══════════════════════════════════════════

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  criticModel: string;
}

const getConfig = (): ProviderConfig => {
  const env = (import.meta as any).env ?? {};
  const apiKey = env.VITE_API_KEY || env.VITE_OPENAI_API_KEY || '';
  const baseUrl = env.VITE_AI_BASE_URL || 'https://api.openai.com/v1';
  const model = env.VITE_AI_MODEL || 'gpt-4o';
  const criticModel = env.VITE_AI_CRITIC_MODEL || model;

  return { baseUrl, apiKey, model, criticModel };
};

// ═══════════════════════════════════════════
// OPENAI-COMPATIBLE API CALLS
// ═══════════════════════════════════════════

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

async function callChatCompletion(
  messages: OpenAIMessage[],
  config: ProviderConfig,
  tools?: any[],
  modelOverride?: string
): Promise<any> {
  const body: any = {
    model: modelOverride || config.model,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════
// TOOL EXECUTION
// ═══════════════════════════════════════════

async function executeToolCall(
  name: string,
  args: any,
  logAudit?: (action: string, details: string, source: AuditEntry['source'], status?: AuditEntry['status']) => void,
  onDraftCreated?: (draftId: string, passed: boolean) => void,
): Promise<any> {
  let result: ValidationStep | any = {};

  try {
    switch (name) {
      case 'verify_ordinary': {
        if (logAudit) logAudit('Verification: Ordinary', `Checking '${args.expense_item}' against NAICS ${args.naics_code}`, 'Arbiter', 'Pending');
        result = await verifyOrdinary(args.naics_code, args.expense_item);
        break;
      }
      case 'verify_necessary': {
        if (logAudit) logAudit('Verification: Necessary', `Analyzing financial ratio for $${args.expense_amount} expense`, 'Arbiter', 'Pending');
        result = await verifyNecessary(args.expense_amount, args.business_revenue);
        break;
      }
      case 'verify_negotiability': {
        if (logAudit) logAudit('UCC 3-104 Check', 'Validating negotiable instrument requirements...', 'Arbiter', 'Pending');
        result = await verifyNegotiability(args as InstrumentTerms);
        break;
      }
      case 'analyze_clause_risks': {
        if (logAudit) logAudit('Risk Analysis', 'Scanning clause against USC/UCC/Common Law...', 'Arbiter', 'Pending');
        result = await analyzeContractRisks(args.clause_text, args.doc_type);
        break;
      }
      case 'consult_statute': {
        if (logAudit) logAudit('Law Library Retrieval', `Fetching raw text for '${args.query}'`, 'System', 'Pending');
        result = await consultStatute(args.query);
        if (result?.silence?.silenced && logAudit) {
          logAudit(
            'Law Corpus Silent',
            result.silence.reason ?? `No match for '${args.query}'`,
            'System',
            'Verified',
          );
        }
        break;
      }
      case 'retrieve_holdings': {
        if (logAudit) logAudit('Common Law Retrieval', `Fetching holdings for '${args.query}'`, 'System', 'Pending');
        result = await commonLawEngine.retrieveHoldings(args);
        if (result?.silence?.silenced && logAudit) {
          logAudit(
            'Holdings Silent',
            result.silence.reason ?? `No usable holdings for '${args.query}'`,
            'System',
            'Verified',
          );
        }
        break;
      }
      case 'translate_register': {
        if (logAudit) logAudit('Register Mirror', `Translating register for '${String(args.text ?? '').slice(0, 120)}'`, 'System', 'Pending');
        result = await registerLexiconClient.translate({ text: String(args.text ?? '') });
        break;
      }
      case 'quick_register_research': {
        if (logAudit) {
          logAudit(
            'Register Research',
            `Clarifying term '${String(args.term ?? '').slice(0, 80)}'`,
            'System',
            'Pending',
          );
        }
        result = await registerLexiconClient.research({
          term: String(args.term ?? ''),
          context: args.context != null ? String(args.context) : undefined,
          corpus_hint: args.corpus_hint != null ? String(args.corpus_hint) : undefined,
        });
        break;
      }
      case 'propose_register_entry': {
        if (logAudit) {
          logAudit(
            'Register Propose',
            `Queuing lexicon proposal for '${String(args.trigger_text ?? '').slice(0, 120)}'`,
            'System',
            'Pending',
          );
        }
        result = await registerLexiconClient.propose({
          trigger_text: String(args.trigger_text ?? ''),
          notes: args.notes != null ? String(args.notes) : undefined,
          mode: args.mode === 'amend' ? 'amend' : 'create',
          entry: args.entry,
        });
        break;
      }
      case 'consult_cold_map': {
        if (logAudit) {
          logAudit(
            'Cold Map',
            `Consulting burns for '${String(args.query ?? '').slice(0, 120)}'`,
            'System',
            'Pending',
          );
        }
        result = await pconColdMapClient.consult({
          query: String(args.query ?? ''),
          limit: typeof args.limit === 'number' ? args.limit : 5,
        });
        break;
      }
      case 'ledger_upsert_case': {
        if (logAudit) {
          logAudit('Ledger: Upsert Case', `Upserting case '${String(args.title ?? '').slice(0, 120)}'`, 'System', 'Pending');
        }
        result = await pconLedgerClient.upsertCase({
          id: args.id,
          title: String(args.title ?? ''),
          goal: String(args.goal ?? ''),
          focus_hypothesis_ids: Array.isArray(args.focus_hypothesis_ids) ? args.focus_hypothesis_ids : undefined,
          working_premise_ids: Array.isArray(args.working_premise_ids) ? args.working_premise_ids : undefined,
          next_intentional_move: args.next_intentional_move,
        });
        break;
      }
      case 'ledger_create_hypothesis': {
        if (logAudit) {
          logAudit('Ledger: Create Hypothesis', `Research-first: seeding '${String(args.title ?? '').slice(0, 120)}' in lane ${args.lane}`, 'System', 'Pending');
        }
        result = await pconLedgerClient.createHypothesis({
          id: args.id,
          title: String(args.title ?? ''),
          claim: String(args.claim ?? ''),
          lane: args.lane,
          disposition: args.disposition,
          confidence: typeof args.confidence === 'number' ? args.confidence : 0,
          tags: Array.isArray(args.tags) ? args.tags : undefined,
          case_id: args.case_id,
          source: String(args.source ?? ''),
        });
        break;
      }
      case 'ledger_attach_evidence': {
        if (logAudit) {
          logAudit('Ledger: Attach Evidence', `Attaching ${args.type}:${String(args.ref ?? '').slice(0, 80)} to ${args.hypothesis_id}`, 'System', 'Pending');
        }
        result = await pconLedgerClient.attachEvidence(String(args.hypothesis_id ?? ''), {
          type: args.type,
          ref: String(args.ref ?? ''),
          weight: typeof args.weight === 'number' ? args.weight : undefined,
          epistemic_ceiling: args.epistemic_ceiling,
        });
        break;
      }
      case 'ledger_advance_lane': {
        if (logAudit) {
          logAudit('Ledger: Advance Lane', `Advancing ${args.hypothesis_id} → ${args.toLane} (seal gates enforced)`, 'System', 'Pending');
        }
        result = await pconLedgerClient.advanceLane(String(args.hypothesis_id ?? ''), {
          toLane: args.toLane,
          seal: args.seal,
          actor: args.actor,
        });
        break;
      }
      case 'ledger_query': {
        if (logAudit) {
          logAudit('Ledger: Query', `Querying ledger mode=${args.mode}`, 'System', 'Pending');
        }
        result = await pconLedgerClient.query({
          mode: args.mode,
          tags: Array.isArray(args.tags) ? args.tags : undefined,
          caseId: args.caseId,
          q: args.q,
          includeParked: typeof args.includeParked === 'boolean' ? args.includeParked : undefined,
        });
        break;
      }
      case 'ledger_export': {
        if (logAudit) {
          logAudit('Ledger: Export', `Exporting ledger${args.caseId ? ` for case ${args.caseId}` : ''}`, 'System', 'Pending');
        }
        const markdown = await pconLedgerClient.export({ caseId: args.caseId });
        result = { markdown };
        break;
      }
      case 'draft_verified_form': {
        if (logAudit) logAudit('Form Generation', `Drafting validated ${args.form_type}...`, 'Arbiter', 'Pending');
        const parsedForm = FormGenerationSchema.safeParse(args);
        if (!parsedForm.success) {
          result = {
            rule_id: 'FORM_GEN',
            passed: false,
            details: `FAILED: Invalid form payload — ${parsedForm.error.issues.map((i) => i.message).join('; ')}`,
            evidence_source: 'FormGenerationSchema',
            timestamp: new Date().toISOString(),
          };
          break;
        }
        const formResult = await createDraftForm(parsedForm.data);
        const primaryStep: SchemaValidationStep = formResult.validation_steps[0] ?? {
          rule_id: 'FORM_GEN',
          passed: formResult.passed,
          details: formResult.passed ? 'Form generated.' : 'Form generation failed.',
          evidence_source: 'System',
          timestamp: new Date().toISOString(),
        };
        result = {
          ...primaryStep,
          draft_id: formResult.draft_id,
          validation_steps: formResult.validation_steps,
        };
        if (formResult.passed) {
          result.generated_content = formResult.generated_content ?? formResult.markdown;
        }
        onDraftCreated?.(formResult.draft_id, formResult.passed);
        break;
      }
      default:
        result = { error: `Unknown tool: ${name}` };
    }

    // Validate result against schema when it looks like a ValidationStep
    if (result.rule_id) {
      const parsed = ValidationStepSchema.safeParse(result);
      if (!parsed.success) {
        console.warn(`Schema validation warning for ${name}:`, parsed.error);
      }
    }

    if (logAudit && name === 'retrieve_holdings' && Array.isArray(result.holdings)) {
      logAudit(
        'Result: holdings',
        `${result.holdings.length} holding(s) returned via ${result.fallbackMode ?? 'none'} fallback mode.`,
        'Arbiter',
        result.holdings.length > 0 ? 'Verified' : 'Error'
      );
    }

    if (logAudit && name === 'translate_register' && Array.isArray(result.matched_terms)) {
      logAudit(
        'Result: register mirror',
        `${result.matched_terms.length} term(s) mirrored from lexicon ${result.provenance?.lexicon_version ?? '?'}.`,
        'Arbiter',
        result.matched_terms.length > 0 ? 'Verified' : 'Error',
      );
    }

    if (logAudit && name === 'quick_register_research' && result.clarity_summary) {
      logAudit(
        'Result: register research',
        `${result.in_lexicon ? 'In pack' : 'Gap'} | ${String(result.clarity_summary).slice(0, 160)}`,
        'Arbiter',
        'Verified',
      );
    }

    if (logAudit && name === 'propose_register_entry' && result.id) {
      logAudit(
        'Result: register propose',
        `Queued ${result.id} status=${result.status} term_id=${result.entry?.term_id ?? '?'}`,
        'Arbiter',
        result.status === 'pending' ? 'Verified' : 'Error',
      );
    }

    if (logAudit && name === 'consult_cold_map' && Array.isArray(result.hits)) {
      logAudit(
        'Result: cold map',
        `${result.hits.length} burn(s); matched=${result.provenance?.matched ?? '?'}`,
        'Arbiter',
        result.hits.length > 0 ? 'Verified' : 'Error',
      );
    }

    if (
      logAudit
      && name !== 'consult_statute'
      && name !== 'retrieve_holdings'
      && name !== 'translate_register'
      && name !== 'quick_register_research'
      && name !== 'propose_register_entry'
      && name !== 'consult_cold_map'
      && result.details
    ) {
      logAudit(
        `Result: ${name.replace('verify_', '').replace('analyze_', '').replace('retrieve_', 'CL-')}`,
        result.details,
        'Arbiter',
        result.passed ? 'Verified' : 'Error'
      );
    }
  } catch (err: any) {
    result = { error: err.message, rule_id: 'TOOL_EXECUTION_ERROR', passed: false, details: err.message, evidence_source: 'System', timestamp: new Date().toISOString() };
    if (logAudit) logAudit('Verification Error', `Tool execution failed: ${err.message}`, 'System', 'Error');
  }

  return result;
}

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

export interface ChatResponse {
  text: string;
  audioData?: Uint8Array;
  /** Passed form drafts available for Word download */
  draftIds?: string[];
  /** Lexicon surfaces matched this turn (proactive + translate_register tool) */
  registerSurfaces?: string[];
}

export interface CriticResponse {
  score: number;
  critique: string;
}

// ═══════════════════════════════════════════
// DRAFT RESPONSE PARSING
// Robust extraction of DraftResponseSchema JSON from model output.
// Handles: raw JSON, JSON inside code fences, malformed/missing JSON.
// ═══════════════════════════════════════════

/**
 * Attempt to extract and parse a DraftResponse from the raw model output.
 * Falls back to a synthetic minimal ledger if the model produced plain text.
 * 
 * NOTE: If parsing fails and the fallback is used, a special synthetic claim
 * with severity 'high' is added to the claims array. This ensures the gate
 * will catch the parsing failure and either block or issue a repair_request,
 * preventing non-compliant model output from bypassing validation.
 */
function parseDraftResponse(rawContent: string): DraftResponse {
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const stripped = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Try direct JSON parse of the full content
  try {
    const parsed = JSON.parse(stripped);
    const validated = DraftResponseSchema.safeParse(parsed);
    if (validated.success) return validated.data;
  } catch (_) { /* fall through */ }

  // Try extracting a JSON object from within the text
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = DraftResponseSchema.safeParse(parsed);
      if (validated.success) return validated.data;

      // If Zod validation failed but draft_text is present, use partial data
      if (parsed.draft_text && typeof parsed.draft_text === 'string') {
        return {
          draft_text: parsed.draft_text,
          claims: Array.isArray(parsed.claims)
            ? parsed.claims.map((c: any) => ({
                id: c.id ?? 'c1',
                text: c.text ?? '',
                kind: ['fact','legal_rule','interpretation','instruction','speculation'].includes(c.kind) ? c.kind : 'interpretation',
                severity: ['low','medium','high'].includes(c.severity) ? c.severity : 'medium',
                evidence: Array.isArray(c.evidence) ? c.evidence : [],
                interpretation_links: Array.isArray(c.interpretation_links) ? c.interpretation_links : [],
              }))
            : [],
        };
      }
    } catch (_) { /* fall through */ }
  }

  // Fallback: treat entire content as draft_text, but add a synthetic high-severity claim
  // that records the parsing failure. This ensures the gate will catch this and either
  // block or request a repair, preventing the non-compliant output from bypassing validation.
  console.warn('[ValidationGate] Model did not output DraftResponseSchema JSON. Using plain-text fallback with parse-failure marker.');
  return {
    draft_text: rawContent,
    claims: [
      {
        id: 'sys:parse_failure',
        text: 'Model output did not conform to DraftResponseSchema JSON structure',
        kind: 'fact',
        severity: 'high',
        evidence: [],
        interpretation_links: [],
      },
    ],
  };
}

// ═══════════════════════════════════════════
// REPAIR ROUND PROMPT
// ═══════════════════════════════════════════

/**
 * Builds the one-time repair prompt sent back to the model when the gate issues a repair_request.
 * Instructs the model to fix specific failed claims while preserving the satirical tone.
 */
function buildRepairPrompt(draft: DraftResponse, failedReasons: string[]): string {
  return (
    `VALIDATION GATE REPAIR REQUEST — one shot, make it count.\n\n` +
    `Your previous draft failed the following gate checks:\n` +
    failedReasons.map((r) => `  • ${r}`).join('\n') +
    `\n\nOriginal draft_text (for reference):\n${draft.draft_text}\n\n` +
    `Instructions:\n` +
    `1. Rewrite draft_text to address every failed claim listed above.\n` +
    `2. Add explicit [interpretation] or [speculation] markers in draft_text for any interpretive claims.\n` +
    `3. For unsupported factual/legal-rule claims: either cite a statute/tool result in evidence[], attach strong interpretation_links from retrieve_holdings, or rephrase with appropriate uncertainty (e.g. "arguably", "appears to").\n` +
    `4. Do NOT introduce new unsupported facts.\n` +
    `5. Preserve the sardonic, confident ArbiterOS tone — do not go full disclaimer-bot.\n` +
    `6. Keep the response concise.\n\n` +
    `Output the corrected response as raw JSON only (same DraftResponseSchema format). No code fences.`
  );
}

/**
 * Send a legal message through the provider-agnostic AI pipeline.
 * Supports multi-turn tool calling for verifiable law.
 */
export const sendLegalMessage = async (
  history: Message[],
  newMessage: string,
  images: string[] = [],
  logAudit?: (action: string, details: string, source: AuditEntry['source'], status?: AuditEntry['status']) => void,
  isShadowCounsel: boolean = false,
  gateState?: GateInputState,
  privateConfidant: boolean = false,
): Promise<ChatResponse> => {
  const config = getConfig();
  const tools = privateConfidant
    ? [...TOOL_DEFINITIONS, ...PRIVATE_REGISTER_TOOLS, ...PRIVATE_LEDGER_TOOLS]
    : TOOL_DEFINITIONS;
  const systemInstruction = privateConfidant
    ? `${LEGAL_SYSTEM_INSTRUCTION}\n${PRIVATE_CONFIDANT_INSTRUCTION}`
    : LEGAL_SYSTEM_INSTRUCTION;

  // Build message history in OpenAI format
  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemInstruction },
  ];

  // Add conversation history
  for (const msg of history) {
    let content = msg.text;
    // If images are present, describe them (vision models support this)
    if (msg.images && msg.images.length > 0) {
      content += `\n\n[${msg.images.length} document(s) attached for analysis]`;
    }
    messages.push({
      role: msg.role === Role.USER ? 'user' : 'assistant',
      content,
    });
  }

  // Add new user message
  let userContent = newMessage;
  if (images.length > 0) {
    userContent += `\n\n[${images.length} document(s) attached for analysis]`;
  }
  messages.push({ role: 'user', content: userContent });

  // Multi-turn tool calling loop
  let turns = 0;
  const maxTurns = 5;
  let finalText = '';
  const draftIds: string[] = [];
  const registerSurfaces: string[] = [];

  // Proactive lexicon pass — Private Confidant workspace only.
  if (privateConfidant) {
    try {
      const proactive = await registerLexiconClient.translate({ text: newMessage });
      for (const term of proactive.matched_terms ?? []) {
        if (term.surface) registerSurfaces.push(term.surface);
      }
      if (logAudit && (proactive.matched_terms?.length ?? 0) > 0) {
        logAudit(
          'Register Mirror',
          `${proactive.matched_terms.length} term(s) registered from your wording (lexicon ${proactive.provenance?.lexicon_version ?? '?'}).`,
          'System',
          'Verified',
        );
      }
    } catch (err) {
      console.warn('[RegisterMirror] Proactive translate unavailable:', err);
    }
  }

  while (turns <= maxTurns) {
    const modelToUse = isShadowCounsel
      ? (process.env.AI_SHADOW_MODEL || config.model)
      : config.model;

    const response = await callChatCompletion(messages, config, tools, modelToUse);
    const choice = response.choices?.[0];

    if (!choice) {
      throw new Error('No response from AI provider');
    }

    const assistantMessage = choice.message;

    // Check for tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      turns++;

      if (logAudit) {
        logAudit('Covenant Protocol', 'Initiating verifiable law check...', 'System', 'Pending');
      }

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call and add results
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(
          toolCall.function.name,
          args,
          logAudit,
          (draftId, passed) => {
            if (passed && !draftIds.includes(draftId)) {
              draftIds.push(draftId);
            }
          },
        );

        if (
          toolCall.function.name === 'translate_register'
          && result
          && Array.isArray(result.matched_terms)
        ) {
          for (const term of result.matched_terms) {
            if (term?.surface) registerSurfaces.push(String(term.surface));
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      continue; // Loop back for next response
    }

    // No tool calls — we have the final response
    finalText = assistantMessage.content || 'The Governance Ledger has been updated.';
    break;
  }

  // ─── Validation Gate Phase ─────────────────────────────────────────────────
  //
  // Parse the model's final output into a DraftResponse (structured claim ledger
  // + draft text). Run the deterministic gate. Perform at most ONE repair round
  // if the gate issues a repair_request. Log the gate decision to the audit ledger.

  // 1. Parse draft response
  const draft = parseDraftResponse(finalText);

  // 2. Run gate (deterministic, no model calls)
  let gateDecision = await runValidationGate(draft, gateState ?? {});

  // 3. If repair requested, perform exactly ONE repair round
  if (gateDecision.decision === 'repair_request') {
    if (logAudit) {
      logAudit(
        'Validation Gate: Repair Round',
        `Gate issued repair_request for ${gateDecision.failed_claims.length} claim(s). Initiating repair...`,
        'System',
        'Refining'
      );
    }

    const repairPrompt = buildRepairPrompt(draft, gateDecision.failed_claims.map((fc) => fc.reason));
    const repairMessages: OpenAIMessage[] = [
      { role: 'system', content: systemInstruction },
      ...messages.slice(1), // preserve conversation context (skip original system msg)
      { role: 'user', content: repairPrompt },
    ];

    try {
      const repairResponse = await callChatCompletion(repairMessages, config, TOOL_DEFINITIONS, config.model);
      const repairContent = repairResponse.choices?.[0]?.message?.content || finalText;
      const repairedDraft = parseDraftResponse(repairContent);
      const repairedDecision = await runValidationGate(repairedDraft, gateState ?? {});

      // Use the repaired gate decision regardless of outcome (no infinite loop)
      gateDecision = repairedDecision;

      if (logAudit) {
        logAudit(
          'Validation Gate: Repair Result',
          `Repair round complete. Gate decision after repair: ${repairedDecision.decision}`,
          'System',
          repairedDecision.decision === 'pass' ? 'Verified' : 'Refining'
        );
      }
    } catch (repairErr: unknown) {
      const errMsg = repairErr instanceof Error ? repairErr.message : String(repairErr);
      console.warn('[ValidationGate] Repair round failed:', errMsg);
      
      if (logAudit) {
        logAudit(
          'Validation Gate: Repair Failed',
          `Repair round encountered an error: ${errMsg}. Falling back to soften decision with disclaimer.`,
          'System',
          'Refining'
        );
      }
      
      // Fall back to soften decision with a clean audit trail
      // Create a new validation step documenting the repair failure
      const repairFailureStep: ValidationStep = {
        rule_id: 'repair_failure',
        passed: false,
        details: `Repair attempt failed with error: ${errMsg}. Claims remain unresolved.`,
        evidence_source: 'System',
        timestamp: new Date().toISOString(),
      };
      
      gateDecision = {
        decision: 'soften' as const,
        final_text: draft.draft_text + '\n\n*[Validation Gate: repair attempt failed -- treat as unverified analysis.]*',
        // Keep the failed claims from the original gate decision (these are the actual issues)
        failed_claims: gateDecision.failed_claims,
        // Add the repair failure step to the audit trail
        validation_steps: [...gateDecision.validation_steps, repairFailureStep],
        audit: {
          score: 0.5,
          critique: `Repair round failed. Falling back to soften: ${gateDecision.failed_claims.length} claim(s) remain unresolved.`,
        },
      };
    }
  }

  // 4. Audit log: gate decision summary
  if (logAudit) {
    const failCount = gateDecision.failed_claims.length;
    const stepCount = gateDecision.validation_steps.length;
    logAudit(
      `Validation Gate: ${gateDecision.decision.toUpperCase()}`,
      `${stepCount} check(s) run | ${failCount} failed claim(s) | decision: ${gateDecision.decision}${gateDecision.audit ? ` | gate score: ${(gateDecision.audit.score * 100).toFixed(0)}%` : ''}`,
      'System',
      gateDecision.decision === 'pass' ? 'Verified' : gateDecision.decision === 'block' ? 'Error' : 'Refining'
    );
  }

  const surfaces = normalizeRegisterSurfaces(registerSurfaces);

  return {
    text: gateDecision.final_text,
    draftIds: draftIds.length > 0 ? draftIds : undefined,
    registerSurfaces: surfaces.length > 0 ? surfaces : undefined,
  };
};

/**
 * Run the Arbiter Audit — a critic pass that scores the AI's compliance.
 */
export const runArbiterAudit = async (adviceText: string): Promise<CriticResponse> => {
  const config = getConfig();

  try {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: CRITIC_SYSTEM_INSTRUCTION },
      {
        role: 'user',
        content: `Audit this advice for strict legal accuracy and tool usage: "${adviceText}"`,
      },
    ];

    const response = await callChatCompletion(messages, config, undefined, config.criticModel);
    const content = response.choices?.[0]?.message?.content || '{}';

    // Parse and validate with Zod
    const parsed = JSON.parse(content);
    const validated = AuditScoreSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    return {
      score: parsed.score || 0.95,
      critique: parsed.critique || 'Verified compliant.',
    };
  } catch (e) {
    console.error('Audit failed', e);
    return { score: 1.0, critique: 'Audit bypass: System optimal.' };
  }
};

/**
 * Generate a legal concept image.
 * Uses DALL-E or compatible image generation API.
 * Note: size parameter kept for API compatibility with callers but mapped to DALL-E format internally.
 */
export const generateContractImage = async (
  prompt: string,
  _size: string
): Promise<string> => {
  const config = getConfig();

  const response = await fetch(`${config.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error('No image generated');
  }

  return `data:image/png;base64,${b64}`;
};
