/**
 * lawCorpusClient.ts — Law corpus retrieval boundary (optional upstream)
 *
 * Queries the ArbiterOS backend `/api/legal/query` first.
 * Falls back to a small hardcoded seed library if the backend is unreachable
 * or returns no match.
 *
 * WhiteGlove the product may sit behind LAW_CORPUS_URL; this client does not
 * embed that harness — HTTP only. Silence-first: see schemas/silenceFirst.ts.
 */

import { apiFetch } from './localApiClient';
import type { SilenceFirstResult } from '../schemas/silenceFirst';
import {
  silenceFirstHit,
  silenceFirstSilent,
} from '../schemas/silenceFirst';

const FETCH_TIMEOUT_MS = 15000;

/** Legacy statute shape + silence-first envelope fields. */
export interface StatuteResult {
  found: boolean;
  title?: string;
  text?: string;
  citation?: string;
  source?: string;
  /** Silence-first envelope (contract v1). */
  silence?: SilenceFirstResult;
}

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

function withSilence(result: Omit<StatuteResult, 'silence'>): StatuteResult {
  if (result.found && result.text) {
    return {
      ...result,
      silence: silenceFirstHit({
        authority_kind: 'statute',
        reason: `Matched statute via ${result.source ?? 'law-corpus'}.`,
        citation: result.citation,
        title: result.title,
        text: result.text,
        metric: 'unknown',
        provenance: result.source,
      }),
    };
  }
  return {
    ...result,
    found: false,
    silence: silenceFirstSilent({
      authority_kind: 'statute',
      reason: 'No match in law corpus (silenced).',
      provenance: result.source,
    }),
  };
}

function fallbackLookup(query: string): StatuteResult {
  const key = Object.keys(LAW_LIBRARY_FALLBACK).find(
    (k) =>
      query.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(query.toLowerCase())
  );
  if (key) {
    const entry = LAW_LIBRARY_FALLBACK[key];
    return withSilence({
      found: true,
      title: entry.title,
      text: entry.text,
      citation: entry.source,
      source: 'fallback',
    });
  }
  return withSilence({ found: false, source: 'fallback' });
}

/**
 * Query the law corpus retrieval boundary.
 * Hits POST /api/legal/query on the Arbiter backend (which may proxy an upstream).
 * Falls back to the hardcoded seed library if unreachable within FETCH_TIMEOUT_MS.
 */
export async function queryLawCorpus(query: string): Promise<StatuteResult> {
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

    return withSilence({
      found: true,
      title: data.title,
      text: data.text,
      citation: data.citation,
      source: data.source ?? 'law-corpus',
    });
  } catch {
    return fallbackLookup(query);
  }
}

/**
 * Query multiple statutes — currently returns the best local result.
 * The backend boundary is single-result for now; callers still get a stable array shape.
 */
export async function queryLawCorpusMulti(query: string, topK = 5): Promise<StatuteResult[]> {
  void topK;
  const result = await queryLawCorpus(query);
  return result.found ? [result] : [];
}

/** @deprecated Use queryLawCorpus — retained alias during rename window. */
export const queryWhiteGlove = queryLawCorpus;
/** @deprecated Use queryLawCorpusMulti */
export const queryWhiteGloveMulti = queryLawCorpusMulti;
