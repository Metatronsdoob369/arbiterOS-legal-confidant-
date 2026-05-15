/**
 * whitegloveClient.ts — WhiteGlove Faith-Less Retrieval Client
 *
 * Queries the local WhiteGlove server (GET /retrieve?q=...) for statute text.
 * Falls back to the hardcoded LAW_LIBRARY if the server isn't reachable.
 *
 * Dataset: joecwales/whiteglove-legal-2026
 * Sources: Law StackExchange (CC BY-SA 4.0) + Project Gutenberg LCC-K (Public Domain)
 */

const WHITEGLOVE_BASE = (import.meta as any).env?.VITE_WHITEGLOVE_URL ?? 'http://localhost:3001';
const FETCH_TIMEOUT_MS = 2500;

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

/**
 * Query the WhiteGlove Faith-Less retrieval endpoint.
 * Returns the top matching statute chunk from the legal corpus.
 * Falls back to the hardcoded library if the server is unreachable within FETCH_TIMEOUT_MS.
 */
export async function queryWhiteGlove(query: string): Promise<StatuteResult> {
  try {
    const url = `${WHITEGLOVE_BASE}/retrieve?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[WhiteGlove] Server returned ${res.status} — using fallback`);
      return fallbackLookup(query);
    }

    const data = await res.json() as {
      found: boolean;
      title?: string;
      text?: string;
      citation?: string;
      source?: string;
    };

    return {
      found: data.found ?? false,
      title: data.title,
      text: data.text,
      citation: data.citation,
      source: data.source ?? 'whiteglove',
    };
  } catch {
    // Server not running or timed out — silent fallback
    return fallbackLookup(query);
  }
}
