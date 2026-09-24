import { describe, expect, it, mock } from 'bun:test';

mock.module('./lawCorpusClient', () => ({
  queryLawCorpus: async (query: string) => {
    if (query.includes('FTC Credit Rule')) {
      return {
        found: true,
        title: 'Unfair Credit Practices',
        citation: '16 CFR § 444.2',
        source: 'fallback',
      };
    }
    return { found: false, source: 'fallback' };
  },
}));

import { analyzeContractRisks } from './legalEngine';

describe('analyzeContractRisks', () => {
  it('returns passed=true for clean contract clauses', async () => {
    const result = await analyzeContractRisks(
      'The party shall deliver notice in writing within 30 days of receipt.',
      'general_contract'
    );

    expect(result.passed).toBe(true);
    expect(result.rule_id).toBe('RISK_SCAN_USC_UCC');
    expect(result.details).toBe('CLEAN: No critical statutory risks identified in extracted clause.');
    expect(result.evidence_source).toBe('USC Title 15, UCC & CFR Title 16');
    expect(result.timestamp).toBeDefined();
  });

  describe('arbitration and waiver clauses', () => {
    it('flags "waive all rights"', async () => {
      const result = await analyzeContractRisks(
        'The buyer agrees to waive all rights to appeal the decision.',
        'agreement'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('CRITICAL: Mandatory arbitration/waiver clauses require scrutiny');
    });

    it('flags "waive jury trial"', async () => {
      const result = await analyzeContractRisks(
        'Each party hereby agrees to waive jury trial in any dispute.',
        'agreement'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('CRITICAL: Mandatory arbitration/waiver clauses require scrutiny');
    });

    it('flags "arbitration"', async () => {
      const result = await analyzeContractRisks(
        'Any dispute shall be resolved through binding arbitration.',
        'agreement'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('CRITICAL: Mandatory arbitration/waiver clauses require scrutiny');
    });
  });

  describe('indemnification clauses', () => {
    it('flags indemnification for gross negligence with "indemnify"', async () => {
      const result = await analyzeContractRisks(
        'The client shall indemnify the contractor even in cases of gross negligence.',
        'service_contract'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('HIGH: Indemnification for gross negligence is often void');
    });

    it('flags indemnification for gross negligence with "hold harmless"', async () => {
      const result = await analyzeContractRisks(
        'The client agrees to hold harmless the vendor against liability resulting from gross negligence.',
        'service_contract'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('HIGH: Indemnification for gross negligence is often void');
    });

    it('does not flag standard indemnification without gross negligence', async () => {
      const result = await analyzeContractRisks(
        'The contractor shall indemnify the client against third-party claims arising from breach.',
        'service_contract'
      );

      expect(result.passed).toBe(true);
      expect(result.details).toBe('CLEAN: No critical statutory risks identified in extracted clause.');
    });
  });

  describe('perpetual terms', () => {
    it('flags perpetual terms in service contracts', async () => {
      const result = await analyzeContractRisks(
        'This agreement shall continue in perpetuity unless terminated by mutual consent.',
        'master_service_agreement'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('MEDIUM: Perpetual terms in service contracts are generally disfavored');
    });

    it('does not flag perpetual terms in non-service contracts', async () => {
      const result = await analyzeContractRisks(
        'The intellectual property license granted herein shall endure in perpetuity.',
        'ip_assignment'
      );

      expect(result.passed).toBe(true);
      expect(result.details).toBe('CLEAN: No critical statutory risks identified in extracted clause.');
    });
  });

  describe('penalty clauses', () => {
    it('flags punitive penalties when liquidated damages is omitted', async () => {
      const result = await analyzeContractRisks(
        'A failure to deliver on time will result in a $10,000 penalty.',
        'supply_contract'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('HIGH: Punitive penalties are generally unenforceable');
    });

    it('does not flag penalty clauses if liquidated damages are specified', async () => {
      const result = await analyzeContractRisks(
        'Late delivery shall incur a pre-agreed fee as liquidated damages, not a penalty.',
        'supply_contract'
      );

      expect(result.passed).toBe(true);
      expect(result.details).toBe('CLEAN: No critical statutory risks identified in extracted clause.');
    });
  });

  describe('confession of judgment', () => {
    it('flags confession of judgment clauses with statute citation when found', async () => {
      const result = await analyzeContractRisks(
        'Debtor authorizes confession of judgment in any court of record.',
        'loan_agreement'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('CRITICAL: Prohibited in consumer contracts. Source: 16 CFR § 444.2');
    });

    it('flags cognovit clauses', async () => {
      const result = await analyzeContractRisks(
        'The debtor signs a cognovit note empowering attorney to confess judgment.',
        'promissory_note'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('CRITICAL: Prohibited in consumer contracts. Source: 16 CFR § 444.2');
    });
  });

  describe('multiple risk triggers', () => {
    it('combines multiple detected risks into the alert message', async () => {
      const result = await analyzeContractRisks(
        'Client agrees to binding arbitration, shall hold harmless vendor for gross negligence, and faces a severe penalty for default.',
        'service_contract'
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain('RISK ALERT:');
      expect(result.details).toContain('CRITICAL: Mandatory arbitration/waiver clauses');
      expect(result.details).toContain('HIGH: Indemnification for gross negligence');
      expect(result.details).toContain('HIGH: Punitive penalties are generally unenforceable');
      expect(result.details.split(' | ')).toHaveLength(3);
    });
  });
});
