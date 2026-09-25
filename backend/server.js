// backend/server.js — CommonLaw Embed + Retrieval Sidecar

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4881;
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = process.env.COMMON_LAW_COLLECTION || 'case-law-holdings';

// Placeholder for CaseLawModernBERT embed (replace with real HF/transformers inference)
// For now: mock or call local Ollama / HF endpoint
async function getEmbedding(text) {
  // TODO: Integrate real model
  // e.g. fetch from local HF server or transformers.js
  return new Array(1024).fill(0).map(() => Math.random() * 0.1 - 0.05); // mock
}

app.post('/embed', async (req, res) => {
  try {
    const { texts } = req.body;
    if (!Array.isArray(texts)) return res.status(400).json({ error: 'texts array required' });

    const embeddings = await Promise.all(texts.map(t => getEmbedding(t)));
    res.json({ embeddings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple health + Qdrant proxy for upsert/search if needed
app.get('/health', async (req, res) => {
  try {
    const qRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, { method: 'GET' });
    const qData = await qRes.json();
    res.json({ status: 'ok', qdrant: qData });
  } catch (e) {
    res.json({ status: 'ok', qdrant: 'unavailable', error: e.message });
  }
});

const SEED_HOLDINGS = [
  {
    id: 'clh-ucc-3-104-unconditional-promise',
    title: 'Negotiability requires an unconditional promise',
    citation: 'Seed Common Law § UCC 3-104 / unconditional promise',
    holding:
      'A writing is not a negotiable instrument when payment depends on another agreement or contingency; negotiability demands an unconditional promise to pay.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['negotiable instrument', 'unconditional promise', 'contingency', 'ucc 3-104'],
  },
  {
    id: 'clh-ucc-3-104-fixed-amount',
    title: 'Negotiability requires a fixed amount of money',
    citation: 'Seed Common Law § UCC 3-104 / fixed amount',
    holding:
      'An instrument fails negotiability if the amount owed cannot be determined from the face of the paper as a fixed sum of money.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['fixed amount', 'money', 'negotiable instrument', 'ucc 3-104'],
  },
  {
    id: 'clh-ucc-3-104-order-bearer',
    title: 'Negotiability requires order or bearer language',
    citation: 'Seed Common Law § UCC 3-104 / order or bearer',
    holding:
      'Paper payable only to a specifically named person without order-or-bearer language does not satisfy the negotiability requirements of UCC 3-104.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['order', 'bearer', 'specific person', 'negotiable instrument', 'ucc 3-104'],
  },
  {
    id: 'clh-ucc-3-104-definite-time',
    title: 'Negotiability requires demand or definite time',
    citation: 'Seed Common Law § UCC 3-104 / demand or definite time',
    holding:
      'An instrument that leaves payment time indefinite is not negotiable because UCC 3-104 requires payment on demand or at a definite time.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['definite time', 'on demand', 'indefinite', 'negotiable instrument', 'ucc 3-104'],
  },
  {
    id: 'clh-common-law-gross-negligence',
    title: 'Gross-negligence indemnity is often void against public policy',
    citation: 'Seed Common Law § public policy / gross negligence indemnity',
    holding:
      'Courts routinely treat indemnity clauses covering a party’s own gross negligence as unenforceable or subject to strict construction against the drafter.',
    statute: 'Common Law Public Policy',
    jurisdiction: 'Multi-jurisdiction',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['gross negligence', 'indemnity', 'public policy', 'strict construction'],
  },
];

function buildCorpusText(holding) {
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

// Bootstrap seed route (idempotent)
app.post('/bootstrap-seed', async (req, res) => {
  try {
    // 1. Ensure collection exists
    const checkRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, { method: 'GET' });
    if (!checkRes.ok) {
      const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors: {
            size: 1024,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
        }),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return res.status(500).json({ error: 'Failed to create collection', details: errData });
      }
    }

    // 2. Compute embeddings for SEED_HOLDINGS
    const corpusTexts = SEED_HOLDINGS.map(buildCorpusText);
    const embeddings = await Promise.all(corpusTexts.map(text => getEmbedding(text)));

    // 3. Construct points payload for Qdrant points API
    const points = SEED_HOLDINGS.map((holding, index) => ({
      id: index + 1,
      vector: embeddings[index],
      payload: {
        ...holding,
        holding_id: holding.id,
      },
    }));

    // 4. Upsert points into Qdrant
    const upsertRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });

    const upsertData = await upsertRes.json();
    if (!upsertRes.ok) {
      return res.status(500).json({ error: 'Failed to upsert points into Qdrant', details: upsertData });
    }

    res.json({
      seeded: true,
      points_count: points.length,
      qdrant: upsertData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[CommonLaw Embed] Running on http://localhost:${PORT}`);
  console.log(`Qdrant: ${QDRANT_URL} | Collection: ${COLLECTION}`);
});
