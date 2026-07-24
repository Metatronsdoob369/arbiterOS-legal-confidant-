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

// Bootstrap seed route (idempotent)
app.post('/bootstrap-seed', async (req, res) => {
  // TODO: Implement upsert of SEED_HOLDINGS from frontend engine
  res.json({ message: 'Seed upsert placeholder — implement with Qdrant points API' });
});

app.listen(PORT, () => {
  console.log(`[CommonLaw Embed] Running on http://localhost:${PORT}`);
  console.log(`Qdrant: ${QDRANT_URL} | Collection: ${COLLECTION}`);
});
