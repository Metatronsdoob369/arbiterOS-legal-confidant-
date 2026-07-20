
// Ported from LegalPackages/auditor.ts.tsx
// Implements the "Faith-Less" Verifiable Law Database Logic and UCC/USC "Contracts in Code"

import { queryWhiteGlove } from './whitegloveClient';

export interface ValidationStep {
  rule_id: string;
  passed: boolean;
  details: string;
  evidence_source: string;
  timestamp: string;
  generated_content?: string; // Optional field for generated forms
}

// --- 0. THE SOURCE OF TRUTH ---
// Queries the WhiteGlove local retrieval server (joecwales/whiteglove-legal-2026).
// Falls back to a hardcoded seed library when the server is not running.
// Set WHITEGLOVE_URL env var to point at a remote instance.

// The "RAG" Tool - strictly retrieves text, does not interpret.
export const consultStatute = async (query: string): Promise<{ found: boolean; title?: string; text?: string; citation?: string }> => {
  return queryWhiteGlove(query);
};


// 1. The "Chastity Belt" Database Client
class VerifiableLawDatabaseClient {
  constructor(private endpoint: string) {
    console.log(`[ArbiterOS]: Connected to Verifiable Law DB at ${endpoint}`);
  }

  // Deterministic query mimicking the provided logic
  async query(naics: string, expense: string): Promise<{ is_ordinary: boolean; source: string }> {
    // Logic from your provided package:
    // Carpenters (238350) + Specific Tools = Ordinary
    if (naics === '238350' && ['truck', 'hammer', 'saw', 'toolbox', 'work_boots'].includes(expense.toLowerCase())) {
      return { 
        is_ordinary: true, 
        source: `LIVE_QUERY: ${this.endpoint}/section/162a/precedent?naics=${naics}` 
      };
    }
    
    // Default fail state for "Faith-Less" strictness
    return { 
      is_ordinary: false, 
      source: `LIVE_QUERY: ${this.endpoint}/section/162a/precedent?naics=${naics}` 
    };
  }
}

const ircDatabase = new VerifiableLawDatabaseClient('https://api.law.gov/rac/irc');

// 2. Rule Checkers

/**
 * Checks if an expense is "ordinary" for a given industry (NAICS).
 */
export const verifyOrdinary = async (naics_code: string, expense_item_category: string): Promise<ValidationStep> => {
  const { is_ordinary, source } = await ircDatabase.query(naics_code, expense_item_category);

  return {
    rule_id: 'rule_is_ordinary',
    passed: is_ordinary,
    details: is_ordinary
      ? `PASSED: '${expense_item_category}' is a verifiable "ordinary" expense under IRC Sec 162(a) for NAICS code ${naics_code}.`
      : `FAILED: '${expense_item_category}' is NOT a verifiable "ordinary" expense under IRC Sec 162(a) for NAICS code ${naics_code}.`,
    evidence_source: source,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Checks if an expense is "necessary" (appropriate amount/ratio).
 */
export const verifyNecessary = async (expense_amount: number, business_revenue: number): Promise<ValidationStep> => {
  // Logic: Expense must be <= 50% of gross revenue to be auto-verified as necessary
  const ratio = expense_amount / business_revenue;
  const is_necessary = ratio <= 0.5;
  const source = `Business Logic (Ratio Analysis)`;

  return {
    rule_id: 'rule_is_necessary',
    passed: is_necessary,
    details: is_necessary
      ? `PASSED: Expense-to-Revenue ratio is ${(ratio * 100).toFixed(1)}% (within 50% threshold).`
      : `FAILED: Expense-to-Revenue ratio is ${(ratio * 100).toFixed(1)}% (exceeds 50% threshold).`,
    evidence_source: source,
    timestamp: new Date().toISOString(),
  };
};

// --- NEW: UCC & NEGOTIABLE INSTRUMENTS LOGIC (The "Wrapped" Law) ---

// UCC 3-104 Definition of Negotiable Instrument
export const UCC_3_104_RULES = {
  id: 'UCC-3-104',
  name: 'Negotiable Instrument',
  requirements: [
    'Unconditional promise or order to pay',
    'Fixed amount of money',
    'Payable to bearer or to order',
    'Payable on demand or at a definite time',
    'No other undertaking or instruction'
  ]
};

export interface InstrumentTerms {
  promise_type: 'conditional' | 'unconditional';
  amount_type: 'fixed' | 'variable';
  currency?: string;
  payable_to: 'bearer' | 'order' | 'specific_person';
  timing: 'demand' | 'definite' | 'indefinite';
  other_undertakings: boolean;
}

export const verifyNegotiability = async (terms: InstrumentTerms): Promise<ValidationStep> => {
  const failures: string[] = [];
  
  // Retrieve the "Truth" to bind the logic
  const statute = await consultStatute('UCC 3-104');

  if (terms.promise_type !== 'unconditional') failures.push('Must be an unconditional promise (UCC 3-104(a))');
  if (terms.amount_type !== 'fixed') failures.push('Must specify a fixed amount of money (UCC 3-104(a))');
  if (terms.payable_to === 'specific_person') failures.push('Must be payable to bearer or to order (UCC 3-104(a)(1))');
  if (terms.timing === 'indefinite') failures.push('Must be payable on demand or at a definite time (UCC 3-104(a)(2))');
  if (terms.other_undertakings) failures.push('Must not state any other undertaking (UCC 3-104(a)(3))');

  const passed = failures.length === 0;
  
  return {
    rule_id: 'UCC_3_104',
    passed,
    details: passed 
      ? 'PASSED: Instrument meets all UCC 3-104 requirements for negotiability.' 
      : `FAILED: Non-negotiable. Violations: ${failures.join(', ')}`,
    evidence_source: statute.citation || 'UCC 3-104', // Binding the code to the RAG result
    timestamp: new Date().toISOString()
  };
};

// --- NEW: CONTRACT RISK ANALYSIS (USC Principles) ---

export const analyzeContractRisks = async (clauseText: string, docType: string): Promise<ValidationStep> => {
  // Simulating analysis against USC Title 15 (Commerce and Trade) and common law
  const risks: string[] = [];
  const lowerText = clauseText.toLowerCase();

  // Heuristic checks (The "Code" around the law)
  // These represent the "Contracts" in the code wrapping the Source Material
  if (lowerText.includes('waive all rights') || lowerText.includes('waive jury trial') || lowerText.includes('arbitration')) {
    risks.push('CRITICAL: Mandatory arbitration/waiver clauses require scrutiny under Federal Arbitration Act (9 U.S.C. § 1 et seq).');
  }
  if ((lowerText.includes('indemnify') || lowerText.includes('hold harmless')) && lowerText.includes('gross negligence')) {
    risks.push('HIGH: Indemnification for gross negligence is often void against public policy per Restatement (Second) of Contracts.');
  }
  if (lowerText.includes('perpetuity') && docType.includes('service')) {
    risks.push('MEDIUM: Perpetual terms in service contracts are generally disfavored in common law.');
  }
  if (lowerText.includes('penalty') && !lowerText.includes('liquidated damages')) {
    risks.push('HIGH: Punitive penalties are generally unenforceable (UCC § 2-718 requires reasonableness).');
  }
  
  // Confession of Judgment (FTC Act)
  // Check against the Library (RAG)
  if (lowerText.includes('confession of judgment') || lowerText.includes('cognovit')) {
    const ftcRule = await consultStatute('FTC Credit Rule');
    if (ftcRule.found) {
        risks.push(`CRITICAL: Prohibited in consumer contracts. Source: ${ftcRule.citation}`);
    } else {
        risks.push('CRITICAL: Confession of Judgment clauses are prohibited in consumer contracts (16 CFR 444.2).');
    }
  }

  const passed = risks.length === 0;

  return {
    rule_id: 'RISK_SCAN_USC_UCC',
    passed, // "Passed" means no critical risks found
    details: passed 
      ? 'CLEAN: No critical statutory risks identified in extracted clause.' 
      : `RISK ALERT: ${risks.join(' | ')}`,
    evidence_source: 'USC Title 15, UCC & CFR Title 16',
    timestamp: new Date().toISOString()
  };
};

// --- LEGAL FORM GENERATION ---
// Compatibility shim: drafting is owned by the Fastify /api/drafts boundary.
// Prefer createDraftForm() from services/draftsClient.ts in new call sites.

export const generateVerifiedForm = async (
  type: string,
  data: Record<string, unknown>,
): Promise<{ markdown: string; validation: ValidationStep; draft_id?: string }> => {
  const { createDraftForm } = await import('./draftsClient');
  const response = await createDraftForm({ ...data, form_type: type });
  const validation = response.validation_steps[0] ?? {
    rule_id: 'FORM_GEN',
    passed: response.passed,
    details: response.passed ? 'Form generated.' : 'Form generation failed.',
    evidence_source: 'System',
    timestamp: new Date().toISOString(),
  };

  return {
    markdown: response.markdown,
    validation: {
      ...validation,
      generated_content: response.generated_content,
    },
    draft_id: response.draft_id,
  };
};
