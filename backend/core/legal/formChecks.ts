import type { ValidationStep } from '../../../schemas/legalSchemas';
import { queryLegalCorpus } from './lawCorpusGateway';

export type InstrumentTerms = {
  promise_type: 'conditional' | 'unconditional';
  amount_type: 'fixed' | 'variable';
  currency?: string;
  payable_to: 'bearer' | 'order' | 'specific_person';
  timing: 'demand' | 'definite' | 'indefinite';
  other_undertakings: boolean;
};

export async function consultStatuteCitation(query: string): Promise<string> {
  try {
    const result = await queryLegalCorpus(query);
    return result.citation || query;
  } catch {
    return query;
  }
}

export async function verifyNegotiability(terms: InstrumentTerms): Promise<ValidationStep> {
  const failures: string[] = [];
  const evidenceSource = await consultStatuteCitation('UCC 3-104');

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
    evidence_source: evidenceSource,
    timestamp: new Date().toISOString(),
  };
}
