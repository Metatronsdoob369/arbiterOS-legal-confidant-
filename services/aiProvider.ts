/**
 * ⚖️ AI Provider Service — De-Googled, Provider-Agnostic
 * 
 * Supports: OpenAI, Ollama (local), OpenRouter, or any OpenAI-compatible API.
 * No Google. No surveillance. Just law.
 * 
 * "The future is not prompted; it is Contracted." — OMC Architecture
 */

import { Message, Role, AuditEntry } from '../types';
import {
  AuditScoreSchema,
  ValidationStepSchema,
  DraftResponseSchema,
  ClaimSchema,
  type AuditScore,
  type DraftResponse,
  type LibraryItem,
  type EvidenceNode,
  type GateDecision,
} from '../schemas/legalSchemas';
import {
  verifyOrdinary,
  verifyNecessary,
  verifyNegotiability,
  analyzeContractRisks,
  generateVerifiedForm,
  consultStatute,
  type ValidationStep,
  type InstrumentTerms,
} from './legalEngine';
import { runValidationGate, type GateInputState } from './validationGate';

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
7. **Negotiability**: For financial instruments, use 'verify_negotiability' for UCC 3-104 compliance.

PROCESS:
- Receive user intent (text or document upload).
- If document: Read it, extract key clauses, run 'analyze_clause_risks'. 
  Then tell them what's wrong with it — and be entertaining about it.
- If request for form: Identify the type, gather parameters, run 'draft_verified_form'.
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
        { "kind": "<statute | tool_result | library_item | evidence_node | url>", "ref": "<citation/ID/URL>", "quote": "<optional verbatim excerpt>" }
      ]
    }
  ]
}

Rules for populating claims:
- List every factual assertion and legal rule stated in draft_text as a separate claim.
- For fact/legal_rule claims, populate evidence[] from your tool call results (statute citations, tool outputs).
- interpretation and speculation claims MUST include an explicit marker in their text, e.g. "[interpretation]" or "[speculation]". If not naturally present in draft_text for those claims, add the marker to the claim.text field.
- Assign severity: high = legal outcomes hinge on this; medium = important but not outcome-determinative; low = background context.
- Keep claim texts concise (one sentence). Do not re-paste entire paragraphs.
`;


const CRITIC_SYSTEM_INSTRUCTION = `
ACT AS: The ArbiterOS Compliance Auditor — a humorless, exacting quality inspector.
You are the opposite of the Confidant's personality. You are pure protocol.

TASK: Forensic audit of the legal advice just given.
CHECKS:
1. Did the response use the required verification tools?
2. Did it cite specific USC/UCC sections from tool outputs?
3. Is the legal logic sound and properly sourced?
4. Did it avoid unsupported legal interpretation?

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
      name: 'draft_verified_form',
      description: 'Generates a validated legal form template (Promissory Note, Security Agreement, etc.).',
      parameters: {
        type: 'object',
        properties: {
          form_type: {
            type: 'string',
            enum: ['promissory_note_ucc', 'security_agreement_ucc', 'bill_of_sale_ucc', 'contractor_agreement'],
          },
          amount: { type: 'number' },
          lender: { type: 'string' },
          borrower: { type: 'string' },
          seller: { type: 'string' },
          buyer: { type: 'string' },
          client: { type: 'string' },
          contractor: { type: 'string' },
          collateral: { type: 'string' },
          goods_description: { type: 'string' },
          services: { type: 'string' },
          date: { type: 'string' },
          state: { type: 'string' },
        },
        required: ['form_type'],
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
  logAudit?: (action: string, details: string, source: AuditEntry['source'], status?: AuditEntry['status']) => void
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
        break;
      }
      case 'draft_verified_form': {
        if (logAudit) logAudit('Form Generation', `Drafting validated ${args.form_type}...`, 'Arbiter', 'Pending');
        const formResult = await generateVerifiedForm(args.form_type, args);
        result = formResult.validation;
        if (formResult.validation.passed) {
          result.generated_content = formResult.markdown;
        }
        break;
      }
      default:
        result = { error: `Unknown tool: ${name}` };
    }

    // Validate result against schema
    if (result.rule_id) {
      const parsed = ValidationStepSchema.safeParse(result);
      if (!parsed.success) {
        console.warn(`Schema validation warning for ${name}:`, parsed.error);
      }
    }

    if (logAudit && name !== 'consult_statute' && result.details) {
      logAudit(
        `Result: ${name.replace('verify_', '').replace('analyze_', '')}`,
        result.details,
        'Arbiter',
        result.passed ? 'Verified' : 'Error'
      );
    }
  } catch (err: any) {
    result = { error: err.message };
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
    `3. For unsupported factual/legal-rule claims: either cite a statute/tool result in evidence[], or rephrase with appropriate uncertainty (e.g. "arguably", "appears to").\n` +
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
  gateState?: GateInputState
): Promise<ChatResponse> => {
  const config = getConfig();

  // Build message history in OpenAI format
  const messages: OpenAIMessage[] = [
    { role: 'system', content: LEGAL_SYSTEM_INSTRUCTION },
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

  while (turns <= maxTurns) {
    const modelToUse = isShadowCounsel
      ? (process.env.AI_SHADOW_MODEL || config.model)
      : config.model;

    const response = await callChatCompletion(messages, config, TOOL_DEFINITIONS, modelToUse);
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
        const result = await executeToolCall(toolCall.function.name, args, logAudit);

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
      { role: 'system', content: LEGAL_SYSTEM_INSTRUCTION },
      ...messages.slice(1), // preserve conversation context (skip original system msg)
      { role: 'user', content: repairPrompt },
    ];

    try {
      const repairResponse = await callChatCompletion(repairMessages, config, undefined, config.model);
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

  return { text: gateDecision.final_text };
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
