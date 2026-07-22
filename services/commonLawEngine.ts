import { apiFetch } from './localApiClient';
import type { SilenceFirstResult } from '../schemas/silenceFirst';

export interface InterpretationLink {
  holding_id: string;
  citation: string;
  relation: 'supports' | 'distinguishes' | 'limits';
  strength: 'weak' | 'moderate' | 'strong';
  quote: string;
}

export interface HoldingSearchResult {
  id: string;
  title: string;
  citation: string;
  holding: string;
  statute: string;
  jurisdiction: string;
  court: string;
  year: number;
  source: string;
  treatment: 'supports' | 'distinguishes' | 'limits';
  keywords: string[];
  score: number;
  strength: InterpretationLink['strength'];
}

export interface CommonLawHealth {
  reachable: boolean;
  exists: boolean;
  collection: string;
  qdrantUrl: string;
  embedEndpoint: string;
  vectorSize: number;
  pointsCount: number;
  seededFallbackReady: boolean;
}

export interface CommonLawQueryInput {
  query: string;
  statute?: string;
  topK?: number;
}

export interface CommonLawQueryResult {
  query: string;
  statute?: string;
  collection: string;
  qdrantUrl: string;
  embedModel: string;
  vectorSize: number;
  fallbackMode: 'none' | 'seeded_collection' | 'seeded_in_memory';
  holdings: HoldingSearchResult[];
  interpretationLinks: InterpretationLink[];
  silence?: SilenceFirstResult;
}

export const commonLawEngine = {
  checkCollectionHealth() {
    return apiFetch<CommonLawHealth>('/api/common-law/health');
  },

  bootstrapHoldings() {
    return apiFetch<{ seeded: boolean; health: CommonLawHealth }>('/api/common-law/bootstrap', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  retrieveHoldings(input: CommonLawQueryInput) {
    return apiFetch<CommonLawQueryResult>('/api/common-law/query', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  embedTexts(texts: string[]) {
    return apiFetch<{ embeddings: number[][] }>('/embed', {
      method: 'POST',
      body: JSON.stringify({ texts }),
    });
  },
};
