/**
 * lawCorpusGateway.ts — Backend boundary for optional statute/code retrieval.
 *
 * Proxies an upstream law-corpus HTTP service. Does not embed WhiteGlove.
 * Env (prefer first): LAW_CORPUS_URL | LAWLIBRA_URL | WHITEGLOVE_URL | QDRANT_PI_URL
 */

import {
  silenceFirstHit,
  silenceFirstSilent,
  type SilenceFirstResult,
} from '../../../schemas/silenceFirst';

const FETCH_TIMEOUT_MS = 15_000;

type LegalUpstreamResult = {
  citation?: string;
  confidence?: string;
  found?: boolean;
  path?: string;
  rank?: number;
  results?: LegalUpstreamResultItem[];
  score?: number;
  shard_id?: string;
  source?: string;
  spectral_band?: string;
  text?: string | null;
  title?: string;
  silenced?: boolean;
  hamming_ratio?: number;
};

type LegalUpstreamResultItem = {
  citation?: string;
  confidence?: string;
  corpus_heat?: number;
  drift?: number;
  path?: string;
  rank?: number;
  score?: number;
  shard_id?: string;
  source?: string;
  spectral_band?: string;
  text?: string | null;
  title?: string;
  hamming_ratio?: number;
};

export type LawCorpusQueryResult = {
  found: boolean;
  title: string;
  text: string;
  citation: string;
  source: string;
  silence: SilenceFirstResult;
};

function buildLegalUrl(pathname: string) {
  return new URL(pathname, getLegalApiBaseUrl()).toString();
}

function getLegalApiBaseUrl() {
  return (
    process.env.LAW_CORPUS_URL ??
    process.env.LAWLIBRA_URL ??
    process.env.WHITEGLOVE_URL ??
    process.env.QDRANT_PI_URL ??
    'http://localhost:4880'
  );
}

function getLegalCollection() {
  return (
    process.env.LAW_CORPUS_COLLECTION ??
    process.env.WHITEGLOVE_COLLECTION ??
    'legal-heatmap'
  );
}

async function fetchJson<T>(pathname: string, init: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(buildLegalUrl(pathname), {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function lowConfidence(confidence?: string): boolean {
  return confidence === 'low';
}

function toSilenceEnvelope(
  query: string,
  base: {
    found: boolean;
    title: string;
    text: string;
    citation: string;
    source: string;
    score?: number;
    confidence?: string;
    hamming_ratio?: number;
    upstreamSilenced?: boolean;
  }
): LawCorpusQueryResult {
  if (
    !base.found ||
    !base.text ||
    base.upstreamSilenced === true ||
    lowConfidence(base.confidence)
  ) {
    const silence = silenceFirstSilent({
      authority_kind: 'statute',
      reason: base.upstreamSilenced
        ? 'Upstream silence policy blocked this match.'
        : lowConfidence(base.confidence)
          ? `Upstream confidence=${base.confidence}; strict silence.`
          : `No statute match for query (corpus silent).`,
      found: base.found,
      score: base.hamming_ratio ?? base.score,
      metric: base.hamming_ratio != null ? 'hamming_ratio' : base.score != null ? 'cosine' : 'unknown',
      provenance: base.source || `backend-proxy:${query}`,
    });
    return {
      found: false,
      title: '',
      text: '',
      citation: '',
      source: base.source || `backend-proxy:${query}`,
      silence,
    };
  }

  const silence = silenceFirstHit({
    authority_kind: 'statute',
    reason: `Matched statute via ${base.source}.`,
    score: base.hamming_ratio ?? base.score,
    metric: base.hamming_ratio != null ? 'hamming_ratio' : base.score != null ? 'cosine' : 'unknown',
    citation: base.citation,
    title: base.title,
    text: base.text,
    provenance: base.source,
  });

  return {
    found: true,
    title: base.title,
    text: base.text,
    citation: base.citation,
    source: base.source,
    silence,
  };
}

function normalizeResult(query: string, upstream: LegalUpstreamResult | null): LawCorpusQueryResult {
  if (!upstream) {
    return toSilenceEnvelope(query, {
      found: false,
      title: '',
      text: '',
      citation: '',
      source: `backend-proxy:${query}`,
    });
  }

  if (typeof upstream.found === 'boolean') {
    return toSilenceEnvelope(query, {
      found: upstream.found,
      title: upstream.title ?? '',
      text: upstream.text ?? '',
      citation: upstream.citation ?? '',
      source: upstream.source ?? 'law-corpus',
      score: upstream.score,
      confidence: upstream.confidence,
      hamming_ratio: upstream.hamming_ratio,
      upstreamSilenced: upstream.silenced,
    });
  }

  const topResult = upstream.results?.[0];
  if (!topResult) {
    return toSilenceEnvelope(query, {
      found: false,
      title: '',
      text: '',
      citation: '',
      source: `backend-proxy:${query}`,
    });
  }

  return toSilenceEnvelope(query, {
    found: true,
    title: topResult.title ?? '',
    text: topResult.text ?? '',
    citation: topResult.citation ?? topResult.shard_id ?? '',
    source: topResult.source ?? 'law-corpus',
    score: topResult.score,
    confidence: topResult.confidence,
    hamming_ratio: topResult.hamming_ratio,
    upstreamSilenced: upstream.silenced,
  });
}

export async function getLegalRetrievalHealth() {
  const upstream = await fetchJson<Record<string, unknown>>('/health', { method: 'GET' });

  return {
    status: upstream ? 'ok' : 'degraded',
    collection: getLegalCollection(),
    lawCorpusUrl: getLegalApiBaseUrl(),
    /** @deprecated alias — prefer lawCorpusUrl */
    qdrant: getLegalApiBaseUrl(),
    upstream,
  };
}

export async function queryLegalCorpus(query: string): Promise<LawCorpusQueryResult> {
  const paths = ['/api/legal/query', '/legal/query'];

  for (const pathname of paths) {
    const upstream = await fetchJson<LegalUpstreamResult>(pathname, {
      method: 'POST',
      body: JSON.stringify({ query, top_k: 1 }),
    });

    const normalized = normalizeResult(query, upstream);
    if (normalized.found && !normalized.silence.silenced) {
      return normalized;
    }
  }

  return toSilenceEnvelope(query, {
    found: false,
    title: '',
    text: '',
    citation: '',
    source: `backend-proxy:${query}`,
  });
}
