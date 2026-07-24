import { apiFetch } from './localApiClient';
import type {
  AdvanceLaneRequest,
  AttachEvidenceRequest,
  CaseStrategy,
  CreateHypothesisRequest,
  ExportLedgerQuery,
  Hypothesis,
  QueryLedgerRequest,
  UpsertCaseRequest,
} from '../schemas/hypothesisLedger';

export interface LedgerHealth {
  ok: boolean;
  belt_version: string;
  hypothesis_count: number;
}

export interface QueryLedgerResult {
  results: Hypothesis[];
}

export const pconLedgerClient = {
  checkHealth() {
    return apiFetch<LedgerHealth>('/api/pcon/ledger/health');
  },

  upsertCase(input: UpsertCaseRequest) {
    return apiFetch<CaseStrategy>('/api/pcon/ledger/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  createHypothesis(input: CreateHypothesisRequest) {
    return apiFetch<Hypothesis>('/api/pcon/ledger/hypotheses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  attachEvidence(hypothesisId: string, input: AttachEvidenceRequest) {
    return apiFetch<Hypothesis>(`/api/pcon/ledger/hypotheses/${encodeURIComponent(hypothesisId)}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  advanceLane(hypothesisId: string, input: AdvanceLaneRequest) {
    return apiFetch<Hypothesis>(`/api/pcon/ledger/hypotheses/${encodeURIComponent(hypothesisId)}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  query(input: QueryLedgerRequest) {
    return apiFetch<QueryLedgerResult>('/api/pcon/ledger/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async export(query: ExportLedgerQuery = {}): Promise<string> {
    const params = new URLSearchParams();
    if (query.caseId) params.set('caseId', query.caseId);
    const qs = params.toString();
    const response = await fetch(`/api/pcon/ledger/export${qs ? `?${qs}` : ''}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Ledger export failed: ${response.status}`);
    }
    return response.text();
  },
};
