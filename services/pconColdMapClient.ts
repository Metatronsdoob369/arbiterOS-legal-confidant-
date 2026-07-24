import { apiFetch } from './localApiClient';
import type { ColdMapConsultRequest, ColdMapConsultResult } from '../schemas/legalSchemas';

export interface ColdMapHealth {
  reachable: boolean;
  entry_count: number;
  active_count: number;
  source_dir: string;
  error?: string;
}

export const pconColdMapClient = {
  checkHealth() {
    return apiFetch<ColdMapHealth>('/api/pcon/cold-map/health');
  },

  consult(input: ColdMapConsultRequest) {
    return apiFetch<ColdMapConsultResult>('/api/pcon/cold-map/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
