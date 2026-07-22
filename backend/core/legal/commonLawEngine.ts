import { createHash } from 'node:crypto';
import { getConfig } from '../../config';
import {
  COMMON_LAW_SEED_HOLDINGS,
  type SeedHolding,
} from './commonLawSeed';
import {
  holdingsToSilenceEnvelope,
  type SilenceFirstResult,
} from '../../../schemas/silenceFirst';

type QdrantCollectionInfo = {
  result?: {
    points_count?: number | null;
  };
};

type QdrantSearchHit = {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
};

type QdrantSearchResponse = {
  result?: QdrantSearchHit[];
};

export interface InterpretationLink {
  holding_id: string;
  citation: string;
  relation: SeedHolding['treatment'];
  strength: 'weak' | 'moderate' | 'strong';
  quote: string;
}

export interface HoldingSearchResult extends SeedHolding {
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
  /** Silence-first envelope (philosophy contract v1). */
  silence: SilenceFirstResult;
}

const FETCH_TIMEOUT_MS = 10_000;
export const EMBED_BATCH_SIZE = 8;

export function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('chunk size must be positive');
  }

  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, index * size + size),
  );
}

function buildCorpusText(holding: SeedHolding): string {
  return [
    holding.title,
    holding.citation,
    holding.statute,
    holding.holding,
    holding.jurisdiction,
    holding.court,
    ...holding.keywords,
  ].join(' ');
}

function magnitude(vector: number[]) {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

function cosineSimilarity(left: number[], right: number[]) {
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
  }

  const denom = magnitude(left) * magnitude(right);
  return denom === 0 ? 0 : dot / denom;
}

function classifyStrength(score: number): InterpretationLink['strength'] {
  if (score >= 0.75) {
    return 'strong';
  }
  if (score >= 0.55) {
    return 'moderate';
  }
  return 'weak';
}

function deterministicEmbedding(text: string, dimensions: number): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalizedText
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    for (let salt = 0; salt < 3; salt += 1) {
      const digest = createHash('sha256')
        .update(`${token}:${salt}`)
        .digest();
      const index = digest.readUInt32BE(0) % dimensions;
      const sign = digest[4] % 2 === 0 ? 1 : -1;
      const weight = 1 + (digest[5] / 255);
      vector[index] += sign * weight;
    }
  }

  const vectorMagnitude = magnitude(vector);
  if (vectorMagnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / vectorMagnitude);
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }

    return {
      ok: true,
      status: response.status,
      data: await response.json() as T,
    };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

function buildQdrantUrl(pathname: string) {
  const config = getConfig();
  return new URL(pathname, config.COMMON_LAW_QDRANT_URL).toString();
}

function mapHolding(payload: Record<string, unknown>, score: number): HoldingSearchResult {
  const holding: HoldingSearchResult = {
    id: String(payload.id ?? payload.holding_id ?? ''),
    title: String(payload.title ?? ''),
    citation: String(payload.citation ?? ''),
    holding: String(payload.holding ?? ''),
    statute: String(payload.statute ?? ''),
    jurisdiction: String(payload.jurisdiction ?? ''),
    court: String(payload.court ?? ''),
    year: Number(payload.year ?? 0),
    source: String(payload.source ?? 'qdrant'),
    treatment: (payload.treatment === 'distinguishes' || payload.treatment === 'limits')
      ? payload.treatment
      : 'supports',
    keywords: Array.isArray(payload.keywords)
      ? payload.keywords.map((keyword) => String(keyword))
      : [],
    score,
    strength: classifyStrength(score),
  };

  return holding;
}

function buildInterpretationLinks(holdings: HoldingSearchResult[]): InterpretationLink[] {
  return holdings.map((holding) => ({
    holding_id: holding.id,
    citation: holding.citation,
    relation: holding.treatment,
    strength: holding.strength,
    quote: holding.holding,
  }));
}

export function reduceToTopologyDim(embedding: number[], targetDim = 8): number[] {
  // Placeholder for the future topology mapping phase; keep live retrieval on full vectors for now.
  void targetDim;
  return [...embedding];
}

async function embedBatch(texts: string[], dimensions: number): Promise<number[][]> {
  return texts.map((text) => deterministicEmbedding(text, dimensions));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { COMMON_LAW_VECTOR_SIZE } = getConfig();
  const batches = chunkItems(texts, EMBED_BATCH_SIZE);
  const embeddings: number[][] = [];

  for (const batch of batches) {
    const batchEmbeddings = await embedBatch(batch, COMMON_LAW_VECTOR_SIZE);
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

export async function checkCollectionHealth(): Promise<CommonLawHealth> {
  const config = getConfig();
  const response = await fetchJson<QdrantCollectionInfo>(
    buildQdrantUrl(`/collections/${config.COMMON_LAW_COLLECTION}`),
    { method: 'GET' },
  );

  return {
    reachable: response.ok,
    exists: response.ok,
    collection: config.COMMON_LAW_COLLECTION,
    qdrantUrl: config.COMMON_LAW_QDRANT_URL,
    embedEndpoint: config.COMMON_LAW_EMBED_ENDPOINT,
    vectorSize: config.COMMON_LAW_VECTOR_SIZE,
    pointsCount: response.data?.result?.points_count ?? 0,
    seededFallbackReady: COMMON_LAW_SEED_HOLDINGS.length > 0,
  };
}

export async function ensureCollection(): Promise<void> {
  const config = getConfig();
  const health = await checkCollectionHealth();
  if (health.exists) {
    return;
  }

  await fetchJson<Record<string, unknown>>(
    buildQdrantUrl(`/collections/${config.COMMON_LAW_COLLECTION}`),
    {
      method: 'PUT',
      body: JSON.stringify({
        vectors: {
          size: config.COMMON_LAW_VECTOR_SIZE,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      }),
    },
  );
}

export async function bootstrapSeedHoldings(): Promise<{
  seeded: boolean;
  health: CommonLawHealth;
}> {
  const config = getConfig();
  await ensureCollection();

  const vectors = await embedTexts(COMMON_LAW_SEED_HOLDINGS.map(buildCorpusText));
  const points = COMMON_LAW_SEED_HOLDINGS.map((holding, index) => ({
    id: index + 1,
    vector: vectors[index],
    payload: {
      ...holding,
      holding_id: holding.id,
    },
  }));

  const response = await fetchJson<Record<string, unknown>>(
    buildQdrantUrl(`/collections/${config.COMMON_LAW_COLLECTION}/points?wait=true`),
    {
      method: 'PUT',
      body: JSON.stringify({ points }),
    },
  );

  return {
    seeded: response.ok,
    health: await checkCollectionHealth(),
  };
}

async function searchQdrant(
  queryVector: number[],
  topK: number,
): Promise<HoldingSearchResult[]> {
  const config = getConfig();
  const response = await fetchJson<QdrantSearchResponse>(
    buildQdrantUrl(`/collections/${config.COMMON_LAW_COLLECTION}/points/search`),
    {
      method: 'POST',
      body: JSON.stringify({
        vector: queryVector,
        limit: topK,
        with_payload: true,
        with_vector: false,
      }),
    },
  );

  if (!response.ok || !response.data?.result) {
    return [];
  }

  return response.data.result
    .filter((hit) => hit.payload)
    .map((hit) => mapHolding(hit.payload ?? {}, hit.score));
}

async function searchSeedHoldingsInMemory(
  queryVector: number[],
  topK: number,
): Promise<HoldingSearchResult[]> {
  const corpusVectors = await embedTexts(COMMON_LAW_SEED_HOLDINGS.map(buildCorpusText));
  return COMMON_LAW_SEED_HOLDINGS
    .map((holding, index) => {
      const score = cosineSimilarity(queryVector, corpusVectors[index]);
      return {
        ...holding,
        score,
        strength: classifyStrength(score),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

export async function queryHoldings(input: CommonLawQueryInput): Promise<CommonLawQueryResult> {
  const config = getConfig();
  const topK = Math.max(1, Math.min(input.topK ?? 5, 10));
  const queryText = [input.query, input.statute].filter(Boolean).join(' ');
  const [queryVector] = await embedTexts([queryText]);

  let fallbackMode: CommonLawQueryResult['fallbackMode'] = 'none';
  let holdings = await searchQdrant(queryVector, topK);

  if (holdings.length === 0 && config.COMMON_LAW_AUTO_BOOTSTRAP) {
    const bootstrapped = await bootstrapSeedHoldings();
    if (bootstrapped.seeded) {
      holdings = await searchQdrant(queryVector, topK);
      fallbackMode = holdings.length > 0 ? 'seeded_collection' : 'none';
    }
  }

  if (holdings.length === 0) {
    holdings = await searchSeedHoldingsInMemory(queryVector, topK);
    fallbackMode = 'seeded_in_memory';
  }

  return {
    query: input.query,
    statute: input.statute,
    collection: config.COMMON_LAW_COLLECTION,
    qdrantUrl: config.COMMON_LAW_QDRANT_URL,
    embedModel: 'deterministic-common-law-1024',
    vectorSize: config.COMMON_LAW_VECTOR_SIZE,
    fallbackMode,
    holdings,
    interpretationLinks: buildInterpretationLinks(holdings),
    silence: holdingsToSilenceEnvelope({
      holdings,
      silence_policy: 'strict',
      provenance: `${config.COMMON_LAW_COLLECTION}:${fallbackMode}`,
    }),
  };
}
