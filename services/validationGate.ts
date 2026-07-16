/**
 * ⚖️ Validation Gate — The Phasegate Between Arbiter and the User
 *
 * Purpose: Reduce confidently-incorrect statements by deterministically
 * validating atomic claims before they reach the user. No model calls.
 * Pure TypeScript. Contracts > Prompts.
 *
 * Decision outcomes:
 *   pass          — All claims verified. Draft ships unchanged.
 *   soften        — Low/medium claims lack evidence. Gate appends uncertainty disclaimer.
 *   block         — High-severity failures or unresolvable statutes. Returns verification-mode response.
 *   repair_request — Fixable failures (e.g. unlabeled interpretation/speculation). Caller runs one repair round.
 *
 * Rules implemented:
 *   R1 — fact/legal_rule claims must have evidence; severity governs harshness of failure.
 *   R2 — statute evidence refs must resolve in the law library (via legalEngine.consultStatute).
 *   R3 — interpretation/speculation claims must carry explicit uncertainty markers.
 *   R4 — block decision produces an in-character "verification mode" response requesting missing inputs.
 *   R5 — legal_rule / interpretation claims MUST carry a valid InterpretationLink with
 *        non-overruled synthesis and graph_weight above threshold (common-law spectral layer).
 *
 * "If it ain't in the schema, it ain't real." — Contracts > Prompts
 */

import type {
  DraftResponse,
  GateDecision,
  FailedClaim,
  Claim,
  LibraryItem,
  EvidenceNode,
} from '../schemas/legalSchemas';
import type { ValidationStep } from './legalEngine';
import { consultStatute } from './legalEngine';

// ═══════════════════════════════════════════
// GATE INPUT STATE
// Optional evidence context passed from the app to enrich gate checks.
// ═══════════════════════════════════════════

export interface GateInputState {
  /** Items from the user's Library panel (quotes, statutes, articles, etc.). */
  libraryItems?: LibraryItem[];
  /** Nodes on the user's Evidence Board. */
  evidenceNodes?: EvidenceNode[];
}

// ═══════════════════════════════════════════
// RULE CONSTANTS
// ═══════════════════════════════════════════

/**
 * Markers that count as explicit uncertainty labeling for R3.
 * The gate checks claim.text OR draft_text for any of these (case-insensitive).
 */
const UNCERTAINTY_MARKERS = [
  '[interpretation]',
  '[speculation]',
  'interpretation:',
  'speculation:',
  'i believe',
  'likely',
  'appears to',
  'arguably',
  'my read',
  'potentially',
  'plausibly',
  'one interpretation',
  'could be read',
];

/** Minimum graph_weight for an InterpretationLink to be considered sufficient under R5. */
const R5_MIN_GRAPH_WEIGHT = 0.35;

// ═══════════════════════════════════════════
// GATE HELPERS
// ═══════════════════════════════════════════

/** Builds the in-character verification-mode response for hard blocks (R4). */
function buildVerificationModeResponse(
  draft: DraftResponse,
  failedClaims: FailedClaim[]
): string {
  const reasons = failedClaims
    .map((fc) => `• ${fc.reason}`)
    .join('\n');

  return (
    `**[VERIFICATION GATE ENGAGED]**\n\n` +
    `I can build you a case — but not on sand. The following assertions couldn't be verified ` +
    `against the available statutes, holdings, library items, or evidence board:\n\n` +
    `${reasons}\n\n` +
    `To proceed with verified counsel, provide:\n` +
    `• Applicable jurisdiction (state/federal)\n` +
    `• Verbatim contract clause or statute text in question\n` +
    `• Any cited statute title/citation you want relied upon\n` +
    `• Controlling or persuasive holdings (or let me retrieve them via the Common Law layer)\n\n` +
    `Arbiter doesn't guess. Arbiter *knows* — or tells you what it needs to know.`
  );
}

/** Appends a softening disclaimer to a draft when low/medium claims lack evidence (R1 soften path). */
function softenResponse(
  draftText: string,
  failedClaims: FailedClaim[]
): string {
  const claimCount = failedClaims.length;
  return (
    draftText +
    `\n\n---\n` +
    `*⚠ Validation Gate Note: ${claimCount} claim${claimCount === 1 ? '' : 's'} in this response ` +
    `lack${claimCount === 1 ? 's' : ''} explicit statutory, holding, or evidentiary support. ` +
    `Treat the above as informed analysis, not verified legal fact. ` +
    `Supply jurisdiction, clause text, statute citations, or holdings to upgrade this to verified counsel.*`
  );
}

/** Checks if any uncertainty marker appears in the given text (case-insensitive). */
function hasUncertaintyMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return UNCERTAINTY_MARKERS.some((m) => lower.includes(m));
}

/** Looks up a library_item evidence ref in the provided library items array. */
function resolveLibraryItem(
  ref: string,
  libraryItems: LibraryItem[]
): LibraryItem | undefined {
  return libraryItems.find(
    (item) =>
      item.id === ref ||
      item.title.toLowerCase().includes(ref.toLowerCase()) ||
      (item.citation ?? '').toLowerCase().includes(ref.toLowerCase())
  );
}

/** Looks up an evidence_node ref in the provided evidence nodes array. */
function resolveEvidenceNode(
  ref: string,
  evidenceNodes: EvidenceNode[]
): EvidenceNode | undefined {
  return evidenceNodes.find(
    (node) =>
      node.id === ref ||
      node.label.toLowerCase().includes(ref.toLowerCase())
  );
}

// ═══════════════════════════════════════════
// MAIN GATE FUNCTION
// ═══════════════════════════════════════════

/**
 * Runs the validation gate over a structured DraftResponse.
 *
 * This function is deterministic and pure TypeScript — no model calls.
 * It is designed to be called from the AI pipeline after the draft is produced.
 *
 * @param draft   The structured draft from the AI (draft_text + claims array).
 * @param inputs  Optional app state for richer evidence lookups.
 * @returns       A GateDecision with decision, final_text, failed_claims, and validation_steps audit trail.
 */
export async function runValidationGate(
  draft: DraftResponse,
  inputs: GateInputState = {}
): Promise<GateDecision> {
  const steps: ValidationStep[] = [];
  const failedClaims: FailedClaim[] = [];
  const { libraryItems = [], evidenceNodes = [] } = inputs;

  // ─── Process each claim ───────────────────────────────────────────

  for (const claim of draft.claims) {
    await processClaim(claim, draft, libraryItems, evidenceNodes, steps, failedClaims);
  }

  // ─── Determine gate decision ──────────────────────────────────────

  if (failedClaims.length === 0) {
    // All checks passed
    return {
      decision: 'pass',
      final_text: draft.draft_text,
      failed_claims: [],
      validation_steps: steps,
      audit: { score: 1.0, critique: 'All claims verified. Gate passed (incl. R5 common-law).' },
    };
  }

  // Identify high-severity failures: hard-block candidates
  const highSeverityFails = failedClaims.filter((fc) => {
    const claim = draft.claims.find((c) => c.id === fc.claim_id);
    return claim?.severity === 'high';
  });

  // R4: hard block for high-severity failures (statute not found, R5 weight fail, high-severity unsupported)
  if (highSeverityFails.length > 0) {
    const highSeverityClaimIds = new Set(
      highSeverityFails.map((fc) => fc.claim_id)
    );
    return {
      decision: 'block',
      final_text: buildVerificationModeResponse(draft, failedClaims),
      failed_claims: failedClaims,
      validation_steps: steps,
      audit: {
        score: 0.0,
        critique: `Gate blocked: ${highSeverityClaimIds.size} high-severity claim(s) failed (R1–R5).`,
      },
    };
  }

  // R3 failures, medium-severity R1, or soft R5 → caller performs repair round
  const repairCandidates = failedClaims.filter((fc) => {
    const claim = draft.claims.find((c) => c.id === fc.claim_id);
    return (
      claim?.kind === 'interpretation' ||
      claim?.kind === 'speculation' ||
      claim?.severity === 'medium' ||
      fc.reason.startsWith('R5:')
    );
  });

  if (repairCandidates.length > 0) {
    const repairClaimIds = new Set(
      repairCandidates.map((fc) => fc.claim_id)
    );
    return {
      decision: 'repair_request',
      final_text: draft.draft_text, // Will be replaced by the repair round result
      failed_claims: failedClaims,
      validation_steps: steps,
      audit: {
        score: 0.5,
        critique: `Gate issued repair request for ${repairClaimIds.size} fixable claim(s) (incl. common-law R5).`,
      },
    };
  }

  // Remaining failures are low-severity → soften
  const lowSeverityClaimIds = new Set(
    failedClaims.map((fc) => fc.claim_id)
  );
  return {
    decision: 'soften',
    final_text: softenResponse(draft.draft_text, failedClaims),
    failed_claims: failedClaims,
    validation_steps: steps,
    audit: {
      score: 0.7,
      critique: `Gate softened: ${lowSeverityClaimIds.size} low-severity claim(s) lack supporting evidence.`,
    },
  };
}

// ═══════════════════════════════════════════
// PER-CLAIM RULE CHECKS
// ═══════════════════════════════════════════

/**
 * Applies rules R1–R5 to a single claim, appending to steps and failedClaims in place.
 */
async function processClaim(
  claim: Claim,
  draft: DraftResponse,
  libraryItems: LibraryItem[],
  evidenceNodes: EvidenceNode[],
  steps: ValidationStep[],
  failedClaims: FailedClaim[]
): Promise<void> {
  const now = () => new Date().toISOString();

  // ── R1: fact / legal_rule must have at least one evidence reference ──────────

  if (claim.kind === 'fact' || claim.kind === 'legal_rule') {
    if (claim.evidence.length === 0) {
      failedClaims.push({
        claim_id: claim.id,
        reason: `R1: ${claim.kind} claim "${claim.text.slice(0, 80)}..." has no supporting evidence (severity: ${claim.severity}).`,
      });
      steps.push({
        rule_id: 'R1_NO_EVIDENCE',
        passed: false,
        details: `Claim [${claim.id}] is a '${claim.kind}' with severity '${claim.severity}' but declares zero evidence references.`,
        evidence_source: 'gate:R1',
        timestamp: now(),
      });
    } else {
      steps.push({
        rule_id: 'R1_EVIDENCE_PRESENT',
        passed: true,
        details: `Claim [${claim.id}] (${claim.kind}) has ${claim.evidence.length} evidence ref(s). R1 satisfied.`,
        evidence_source: 'gate:R1',
        timestamp: now(),
      });
    }
  }

  // ── R2: statute evidence refs must resolve in the law library ────────────────

  for (const ev of claim.evidence) {
    if (ev.kind === 'statute') {
      const lookup = await consultStatute(ev.ref);
      if (!lookup.found) {
        // Statute cited but not in the law library — cannot verify the claim
        failedClaims.push({
          claim_id: claim.id,
          reason: `R2: Statute "${ev.ref}" cited in claim [${claim.id}] but not found in the law library.`,
        });
        steps.push({
          rule_id: 'R2_STATUTE_NOT_FOUND',
          passed: false,
          details: `Statute ref "${ev.ref}" for claim [${claim.id}] could not be resolved via legalEngine.consultStatute.`,
          evidence_source: 'gate:R2:legalEngine',
          timestamp: now(),
        });
      } else {
        steps.push({
          rule_id: 'R2_STATUTE_RESOLVED',
          passed: true,
          details: `Statute ref "${ev.ref}" for claim [${claim.id}] resolved to "${lookup.citation}".`,
          evidence_source: `gate:R2:${lookup.citation ?? ev.ref}`,
          timestamp: now(),
        });
      }
    }

    // Bonus R2-adjacent: resolve library_item refs for richer audit trail
    if (ev.kind === 'library_item') {
      const item = resolveLibraryItem(ev.ref, libraryItems);
      steps.push({
        rule_id: item ? 'R2_LIBRARY_ITEM_RESOLVED' : 'R2_LIBRARY_ITEM_NOT_FOUND',
        passed: !!item,
        details: item
          ? `Library item ref "${ev.ref}" for claim [${claim.id}] resolved to "${item.title}".`
          : `Library item ref "${ev.ref}" for claim [${claim.id}] not found in current library — note only (not a hard failure).`,
        evidence_source: `gate:R2:library:${ev.ref}`,
        timestamp: now(),
      });
    }

    // Bonus R2-adjacent: resolve evidence_node refs
    if (ev.kind === 'evidence_node') {
      const node = resolveEvidenceNode(ev.ref, evidenceNodes);
      steps.push({
        rule_id: node ? 'R2_EVIDENCE_NODE_RESOLVED' : 'R2_EVIDENCE_NODE_NOT_FOUND',
        passed: !!node,
        details: node
          ? `Evidence node ref "${ev.ref}" for claim [${claim.id}] resolved to "${node.label}".`
          : `Evidence node ref "${ev.ref}" for claim [${claim.id}] not found on board — note only (not a hard failure).`,
        evidence_source: `gate:R2:board:${ev.ref}`,
        timestamp: now(),
      });
    }

    // Holding refs are trusted if present (validated by commonLawEngine schemas)
    if (ev.kind === 'holding') {
      steps.push({
        rule_id: 'R2_HOLDING_PRESENT',
        passed: true,
        details: `Holding ref "${ev.ref}" attached to claim [${claim.id}]. Common-law object present.`,
        evidence_source: `gate:R2:holding:${ev.ref}`,
        timestamp: now(),
      });
    }
  }

  // ── R3: interpretation / speculation must carry uncertainty markers ──────────

  if (claim.kind === 'interpretation' || claim.kind === 'speculation') {
    const isLabeledInClaim = hasUncertaintyMarker(claim.text);
    const isLabeledInDraft = hasUncertaintyMarker(draft.draft_text);

    if (!isLabeledInClaim && !isLabeledInDraft) {
      failedClaims.push({
        claim_id: claim.id,
        reason: `R3: Claim [${claim.id}] is marked '${claim.kind}' but neither the claim text nor the draft response includes an explicit uncertainty marker (e.g. "[interpretation]", "arguably", "likely").`,
      });
      steps.push({
        rule_id: 'R3_LABEL_MISSING',
        passed: false,
        details: `Claim [${claim.id}] (${claim.kind}): no uncertainty marker found in claim text or draft_text.`,
        evidence_source: 'gate:R3',
        timestamp: now(),
      });
    } else {
      steps.push({
        rule_id: 'R3_LABEL_PRESENT',
        passed: true,
        details: `Claim [${claim.id}] (${claim.kind}): uncertainty marker confirmed in ${isLabeledInClaim ? 'claim text' : 'draft_text'}.`,
        evidence_source: 'gate:R3',
        timestamp: now(),
      });
    }
  }

  // ── R5: legal_rule / interpretation MUST have InterpretationLink with sufficient weight ──

  if (claim.kind === 'legal_rule' || claim.kind === 'interpretation') {
    const link = claim.interpretation_link;

    if (!link) {
      failedClaims.push({
        claim_id: claim.id,
        reason: `R5: ${claim.kind} claim [${claim.id}] lacks an InterpretationLink. Common-law holdings required.`,
      });
      steps.push({
        rule_id: 'R5_NO_INTERPRETATION_LINK',
        passed: false,
        details: `Claim [${claim.id}] (${claim.kind}, severity=${claim.severity}) has no interpretation_link. R5 requires spectral holding support.`,
        evidence_source: 'gate:R5',
        timestamp: now(),
      });
      return; // further R5 checks N/A
    }

    // Synthesis checks
    if (link.synthesis === 'overruled' || link.synthesis === 'insufficient_authority') {
      failedClaims.push({
        claim_id: claim.id,
        reason: `R5: InterpretationLink for claim [${claim.id}] has synthesis="${link.synthesis}" (graph_weight=${link.graph_weight.toFixed(3)}). Not controlling authority.`,
      });
      steps.push({
        rule_id: 'R5_INSUFFICIENT_OR_OVERRULED',
        passed: false,
        details: `Claim [${claim.id}]: synthesis=${link.synthesis}, graph_weight=${link.graph_weight}, holdings=${link.holding_refs.length}.`,
        evidence_source: 'gate:R5:commonLawEngine',
        timestamp: now(),
      });
      return;
    }

    if (link.graph_weight < R5_MIN_GRAPH_WEIGHT) {
      failedClaims.push({
        claim_id: claim.id,
        reason: `R5: graph_weight ${link.graph_weight.toFixed(3)} below threshold ${R5_MIN_GRAPH_WEIGHT} for claim [${claim.id}].`,
      });
      steps.push({
        rule_id: 'R5_WEIGHT_BELOW_THRESHOLD',
        passed: false,
        details: `Claim [${claim.id}]: graph_weight=${link.graph_weight} < ${R5_MIN_GRAPH_WEIGHT}. Need stronger or more recent holdings.`,
        evidence_source: 'gate:R5',
        timestamp: now(),
      });
      return;
    }

    // Passed R5
    steps.push({
      rule_id: 'R5_COMMON_LAW_PASS',
      passed: true,
      details: `Claim [${claim.id}]: InterpretationLink present. synthesis=${link.synthesis}, graph_weight=${link.graph_weight.toFixed(3)}, holdings=${link.holding_refs.length}. R5 satisfied.`,
      evidence_source: 'gate:R5:commonLawEngine',
      timestamp: now(),
    });
  }
}
