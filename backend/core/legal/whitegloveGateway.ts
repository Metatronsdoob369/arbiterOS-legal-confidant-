export function getLegalRetrievalHealth() {
  return {
    status: 'degraded',
    collection: process.env.WHITEGLOVE_COLLECTION ?? 'legal-heatmap',
    qdrant: process.env.QDRANT_PI_URL ?? process.env.WHITEGLOVE_URL ?? 'http://localhost:4880',
  };
}

export async function queryLegalCorpus(query: string) {
  return {
    found: false,
    title: '',
    text: '',
    citation: '',
    source: `backend-proxy:${query}`,
  };
}
