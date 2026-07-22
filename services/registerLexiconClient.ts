import { apiFetch } from './localApiClient';
import type {
  RegisterMirrorResult,
  RegisterProposal,
  RegisterProposeRequest,
  RegisterResearchRequest,
  RegisterResearchResult,
  RegisterTranslateRequest,
} from '../schemas/legalSchemas';

export interface RegisterLexiconHealth {
  reachable: boolean;
  lexicon_id?: string;
  version?: string;
  entry_count?: number;
  source_path?: string;
  error?: string;
}

export const registerLexiconClient = {
  checkHealth() {
    return apiFetch<RegisterLexiconHealth>('/api/register/health');
  },

  translate(input: RegisterTranslateRequest) {
    return apiFetch<RegisterMirrorResult>('/api/register/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  /** Clarify a term (case-aware) before propose. */
  research(input: RegisterResearchRequest) {
    return apiFetch<RegisterResearchResult>('/api/register/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  /** Capture only — never merges into the live pack. Human merge via API. */
  propose(input: RegisterProposeRequest) {
    return apiFetch<RegisterProposal>('/api/register/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  listProposals(status?: RegisterProposal['status']) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<{ proposals: RegisterProposal[] }>(`/api/register/proposals${qs}`);
  },

  mergeProposal(id: string) {
    return apiFetch<{ proposal: RegisterProposal; lexicon: { version: string } }>(
      `/api/register/proposals/${encodeURIComponent(id)}/merge`,
      { method: 'POST' },
    );
  },

  rejectProposal(id: string, reason?: string) {
    return apiFetch<RegisterProposal>(
      `/api/register/proposals/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      },
    );
  },
};
