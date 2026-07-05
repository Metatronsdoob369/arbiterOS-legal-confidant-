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
};

function buildLegalUrl(pathname: string) {
  return new URL(pathname, getLegalApiBaseUrl()).toString();
}

function getLegalApiBaseUrl() {
  return process.env.LAWLIBRA_URL
    ?? process.env.WHITEGLOVE_URL
    ?? process.env.QDRANT_PI_URL
    ?? 'http://localhost:4880';
}

function getLegalCollection() {
  return process.env.WHITEGLOVE_COLLECTION ?? 'legal-heatmap';
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

    return await response.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeResult(query: string, upstream: LegalUpstreamResult | null): {
  found: boolean;
  title: string;
  text: string;
  citation: string;
  source: string;
} {
  if (!upstream) {
    return {
      found: false,
      title: '',
      text: '',
      citation: '',
      source: `backend-proxy:${query}`,
    };
  }

  if (typeof upstream.found === 'boolean') {
    return upstream.found
      ? {
          found: true,
          title: upstream.title ?? '',
          text: upstream.text ?? '',
          citation: upstream.citation ?? '',
          source: upstream.source ?? 'whiteglove-manifold',
        }
      : {
          found: false,
          title: '',
          text: '',
          citation: '',
          source: upstream.source ?? `backend-proxy:${query}`,
        };
  }

  const topResult = upstream.results?.[0];
  if (!topResult) {
    return {
      found: false,
      title: '',
      text: '',
      citation: '',
      source: `backend-proxy:${query}`,
    };
  }

  return {
    found: true,
    title: topResult.title ?? '',
    text: topResult.text ?? '',
    citation: topResult.citation ?? topResult.shard_id ?? '',
    source: topResult.source ?? 'whiteglove-manifold',
  };
}

export async function getLegalRetrievalHealth() {
  const upstream = await fetchJson<Record<string, unknown>>('/health', { method: 'GET' });

  return {
    status: upstream ? 'ok' : 'degraded',
    collection: getLegalCollection(),
    qdrant: getLegalApiBaseUrl(),
    upstream,
  };
}

export async function queryLegalCorpus(query: string) {
  const paths = ['/api/legal/query', '/legal/query'];

  for (const pathname of paths) {
    const upstream = await fetchJson<LegalUpstreamResult>(pathname, {
      method: 'POST',
      body: JSON.stringify({ query, top_k: 1 }),
    });

    const normalized = normalizeResult(query, upstream);
    if (normalized.found) {
      return normalized;
    }
  }

  return {
    found: false,
    title: '',
    text: '',
    citation: '',
    source: `backend-proxy:${query}`,
  };
}
