import { describe, expect, it } from 'vitest';
import {
  chunkItems,
  EMBED_BATCH_SIZE,
  embedTexts,
  reduceToTopologyDim,
} from './commonLawEngine';

describe('commonLawEngine embedding helpers', () => {
  it('chunks texts into fixed embed batches', () => {
    const values = Array.from({ length: EMBED_BATCH_SIZE * 2 + 1 }, (_, index) => index);

    expect(chunkItems(values, EMBED_BATCH_SIZE)).toEqual([
      values.slice(0, EMBED_BATCH_SIZE),
      values.slice(EMBED_BATCH_SIZE, EMBED_BATCH_SIZE * 2),
      values.slice(EMBED_BATCH_SIZE * 2),
    ]);
  });

  it('embeds long opinion text across multiple fixed batches', async () => {
    const longOpinion = Array.from(
      { length: 400 },
      (_, index) => `Opinion paragraph ${index} discussing negotiable instrument doctrine.`,
    ).join(' ');
    const texts = Array.from({ length: EMBED_BATCH_SIZE + 1 }, (_, index) => `${longOpinion} ${index}`);

    const embeddings = await embedTexts(texts);

    expect(embeddings).toHaveLength(texts.length);
    expect(embeddings.every((embedding) => embedding.length === 1024)).toBe(true);
  });

  it('keeps topology reduction as an explicit no-op placeholder for now', () => {
    const embedding = [0.1, -0.2, 0.3];

    const reduced = reduceToTopologyDim(embedding, 8);

    expect(reduced).toEqual(embedding);
    expect(reduced).not.toBe(embedding);
  });
});
