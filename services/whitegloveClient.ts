/**
 * whitegloveClient.ts — WhiteGlove Faith-Less Retrieval Client
 *
 * Queries the local ArbiterOS legal backend boundary first.
 * Falls back to the hardcoded LAW_LIBRARY if the backend is unreachable
 * or returns no match.
 */

import { apiFetch } from './localApiClient';

const FETCH_TIMEOUT_MS = 15000;

export interface StatuteResult {
  found: boolean;
  title?: string;
  text?: string;
  citation?: string;
  source?: string;
}

// Fallback library — used when WhiteGlove server isn't running
const LAW_LIBRARY_FALLBACK: Record<string, { title: string; text: string; source: string }> = {
  'UCC 3-104': {
    title: 'Negotiable Instrument',
    source: 'Uniform Commercial Code § 3-104',
    text: `(a) ...means an unconditional promise or order to pay a fixed amount of money, with or without interest or other charges described in the promise or order, if it: (1) is payable to bearer or to order at the time it is issued or first comes into possession of a holder; (2) is payable on demand or at a definite time; and (3) does not state any other undertaking or instruction...`
  },
  'UCC 9-203': {
    title: 'Attachment and Enforceability of Security Interest',
    source: 'Uniform Commercial Code § 9-203',
    text: `(b) ...a security interest is enforceable against the debtor and third parties with respect to the collateral only if: (1) value has been given; (2) the debtor has rights in the collateral... and (3) one of the following conditions is met: (A) the debtor has authenticated a security agreement that provides a description of the collateral...`
  },
  'UCC 2-201': {
    title: 'Formal Requirements; Statute of Frauds',
    source: 'Uniform Commercial Code § 2-201',
    text: `(1) a contract for the sale of goods for the price of $500 or more is not enforceable by way of action or defense unless there is some writing sufficient to indicate that a contract for sale has been made between the parties and signed by the party against whom enforcement is sought...`
  },
  'FTC Credit Rule': {
    title: 'Unfair Credit Practices',
    source: '16 CFR § 444.2',
    text: `(a) In connection with the extension of credit... it is an unfair act or practice... for a lender or retail installment seller... to take or receive from a consumer an obligation that: (1) Constitutes or contains a cognovit or confession of judgment (for other than purposes of executory process in the State of Louisiana)...`
  }
};

function fallbackLookup(query: string): StatuteResult {
  const key = Object.keys(LAW_LIBRARY_FALLBACK).find(
    k => query.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(query.toLowerCase())
  );
  if (key) {
    const entry = LAW_LIBRARY_FALLBACK[key];
    return { found: true, title: entry.title, text: entry.text, citation: entry.source, source: 'fallback' };
  }
  return { found: false };
}

interface LegalQueryResult {
  rank: number;
  score: number;
  citation: string;
  title: string;
  source: string;
  path: string;
  spectral_band: string;
  corpus_heat: number;
  drift: number;
  shard_id: string;
  confidence: 'high' | 'medium' | 'low';
  text?: string | null;
}

interface LegalQueryResponse {
  query: string;
  results: LegalQueryResult[];
  meta: {
    total_returned: number;
    collection: string;
    embed_model: string;
    vector_dims: number;
    latency_ms: number;
  };
}

/**
 * Query the WhiteGlove Faith-Less retrieval endpoint.
 * Hits POST /legal/query — Qdrant-backed semantic search over 52K+ Alabama statutes.
 * Returns the top matching statute with citation and spectral confidence band.
 * Falls back to the hardcoded library if the server is unreachable within FETCH_TIMEOUT_MS.
 */
export async function queryWhiteGlove(query: string): Promise<StatuteResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const data = await apiFetch<StatuteResult>('/api/legal/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!data.found) {
      return fallbackLookup(query);
    }

    return data;
  } catch {
    return fallbackLookup(query);
  }
}

/**
 * Query multiple statutes — currently returns the best local result.
 * The backend boundary is single-result for now; callers still get a stable array shape.
 */
export async function queryWhiteGloveMulti(query: string, topK = 5): Promise<StatuteResult[]> {
  void topK;
  const result = await queryWhiteGlove(query);
  return result.found ? [result] : [];
}
