/**
 * whitegloveClient.ts — WhiteGlove Faith-Less Retrieval Client
 *
 * Queries the WhiteGlove legal endpoint (POST /legal/query) backed by
 * 52K+ Alabama statutes in Qdrant (legal-heatmap collection).
 * Falls back to the hardcoded LAW_LIBRARY if the server isn't reachable.
 *
 * Dataset: joecwales/whiteglove-legal-2026
 * Sources: Alabama Code + Law StackExchange (CC BY-SA 4.0) + Project Gutenberg LCC-K (Public Domain)
 */

const WHITEGLOVE_BASE = (import.meta as any).env?.VITE_WHITEGLOVE_URL ?? 'http://localhost:4880';
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

    const res = await fetch(`${WHITEGLOVE_BASE}/legal/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 3 }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[WhiteGlove] Server returned ${res.status} — using fallback`);
      return fallbackLookup(query);
    }

    const data = await res.json() as LegalQueryResponse;
    const top = data.results?.[0];

    if (!top) return { found: false };

    const bodyText = top.text
      ? top.text
      : `[Shard ${top.shard_id} — text not available locally]`;

    return {
      found: true,
      title: top.title || top.citation,
      text: bodyText,
      citation: top.citation,
      source: `whiteglove:${top.shard_id}`,
    };
  } catch {
    // Server not running or timed out — silent fallback
    return fallbackLookup(query);
  }
}

/**
 * Query multiple statutes — returns ranked results for richer UI display.
 * Use this when you want to show citations list rather than single-statute confirmation.
 */
export async function queryWhiteGloveMulti(query: string, topK = 5): Promise<StatuteResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${WHITEGLOVE_BASE}/legal/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json() as LegalQueryResponse;
    return (data.results ?? []).map(r => ({
      found: true,
      title: r.title || r.citation,
      text: r.text || `[Shard ${r.shard_id}]`,
      citation: r.citation,
      source: `whiteglove:${r.shard_id}`,
    }));
  } catch {
    return [];
  }
}
