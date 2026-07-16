import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
  COMMON_LAW_QDRANT_URL: process.env.COMMON_LAW_QDRANT_URL,
  COMMON_LAW_COLLECTION: process.env.COMMON_LAW_COLLECTION,
  COMMON_LAW_VECTOR_SIZE: process.env.COMMON_LAW_VECTOR_SIZE,
  COMMON_LAW_EMBED_ENDPOINT: process.env.COMMON_LAW_EMBED_ENDPOINT,
  COMMON_LAW_AUTO_BOOTSTRAP: process.env.COMMON_LAW_AUTO_BOOTSTRAP,
};

beforeEach(() => {
  process.env.ARBITER_DB_PATH = ':memory:';
  process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
  process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';
  process.env.COMMON_LAW_QDRANT_URL = 'http://127.0.0.1:6333';
  process.env.COMMON_LAW_COLLECTION = 'case-law-holdings';
  process.env.COMMON_LAW_VECTOR_SIZE = '1024';
  process.env.COMMON_LAW_EMBED_ENDPOINT = 'http://127.0.0.1:4881/embed';
  process.env.COMMON_LAW_AUTO_BOOTSTRAP = 'true';
});

afterEach(() => {
  process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
  process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
  process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
  process.env.COMMON_LAW_QDRANT_URL = originalEnv.COMMON_LAW_QDRANT_URL;
  process.env.COMMON_LAW_COLLECTION = originalEnv.COMMON_LAW_COLLECTION;
  process.env.COMMON_LAW_VECTOR_SIZE = originalEnv.COMMON_LAW_VECTOR_SIZE;
  process.env.COMMON_LAW_EMBED_ENDPOINT = originalEnv.COMMON_LAW_EMBED_ENDPOINT;
  process.env.COMMON_LAW_AUTO_BOOTSTRAP = originalEnv.COMMON_LAW_AUTO_BOOTSTRAP;
  vi.unstubAllGlobals();
});

describe('common law routes', () => {
  it('returns 1024-dimensional embeddings from /embed', async () => {
    const longOpinion = Array.from(
      { length: 250 },
      (_, index) => `Full opinion section ${index} on unconditional promise and holder in due course.`,
    ).join(' ');
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/embed',
      payload: {
        texts: Array.from({ length: 9 }, (_, index) => `${longOpinion} ${index}`),
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as { embeddings: number[][] };
    expect(payload.embeddings).toHaveLength(9);
    expect(payload.embeddings.every((embedding) => embedding.length === 1024)).toBe(true);
  });

  it('reports common-law collection health from Qdrant', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      result: { points_count: 5 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/common-law/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      reachable: true,
      exists: true,
      collection: 'case-law-holdings',
      pointsCount: 5,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:6333/collections/case-law-holdings',
      expect.any(Object),
    );
  });

  it('falls back to seeded in-memory holdings when Qdrant is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('qdrant unavailable');
    }));

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/common-law/query',
      payload: {
        query: 'negotiable instrument unconditional promise',
        statute: 'UCC 3-104',
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      fallbackMode: string;
      holdings: Array<{ statute: string }>;
      interpretationLinks: Array<{ relation: string }>;
    };
    expect(payload.fallbackMode).toBe('seeded_in_memory');
    expect(payload.holdings[0]?.statute).toBe('UCC 3-104');
    expect(payload.interpretationLinks[0]?.relation).toBe('supports');
  });

  it('bootstraps the Qdrant collection and upserts the seed holdings', async () => {
    let collectionChecks = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = input.toString();

      if (requestUrl.endsWith('/collections/case-law-holdings') && init?.method === 'GET') {
        collectionChecks += 1;
        if (collectionChecks === 1) {
          return new Response(JSON.stringify({ message: 'missing' }), { status: 404 });
        }
        return new Response(JSON.stringify({
          result: { points_count: 5 },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.endsWith('/collections/case-law-holdings') && init?.method === 'PUT') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requestUrl.includes('/collections/case-law-holdings/points') && init?.method === 'PUT') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`unexpected fetch: ${requestUrl}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/common-law/bootstrap',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      seeded: true,
      health: expect.objectContaining({
        exists: true,
        pointsCount: 5,
      }),
    });
  });
});
