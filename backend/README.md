# CommonLaw Embed + Retrieval Backend

Lightweight Express sidecar for:
- `/embed` — CaseLawModernBERT-large inference
- Qdrant proxy / bootstrap seeding

## Run
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Integrate with frontend `VITE_EMBED_ENDPOINT=http://localhost:4881/embed`.

Next: Replace mock embedding with real HF / Ollama pipeline.