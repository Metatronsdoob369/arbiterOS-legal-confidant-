import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  coerceEmbedding,
  discoverCaslawDataFiles,
  normalizeCaslawRecord,
  parseCliArgs,
  toQdrantPointId,
} from './bootstrapCaslawDrive.utils';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('bootstrapCaslawDrive utils', () => {
  it('converts non-uuid string ids into stable UUIDs', () => {
    const pointId = toQdrantPointId('case-abc-123');
    expect(pointId).toMatch(/^[0-9a-f-]{36}$/);
    expect(toQdrantPointId('case-abc-123')).toBe(pointId);
  });

  it('normalizes records into Qdrant points and truncates payload text', () => {
    const normalized = normalizeCaslawRecord({
      id: 'case-42',
      embedding: Array.from({ length: 1024 }, (_, index) => index / 1024),
      text: 'x'.repeat(2500),
      court_level: 'appellate',
      decision_date: '2026-01-01',
      treatment: 'positive',
      statute_refs: 'UCC 3-104, UCC 3-106',
    });

    expect(normalized.payload.text).toHaveLength(2000);
    expect(normalized.payload.court_level).toBe('appellate');
    expect(normalized.payload.statute_refs).toEqual(['UCC 3-104', 'UCC 3-106']);
  });

  it('rejects embeddings with the wrong dimension', () => {
    expect(() => coerceEmbedding([1, 2, 3], 1024)).toThrow(/Embedding length 3/);
  });

  it('discovers supported data files under the drive mount', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'caslaw-drive-'));
    tempDirs.push(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'embeddings-1024d', 'parquet'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'embeddings-1024d', 'parquet', 'part-0001.parquet'), 'stub');
    fs.writeFileSync(path.join(tempRoot, 'ignore.txt'), 'stub');

    const discovered = discoverCaslawDataFiles({
      driveMount: tempRoot,
      inputPath: undefined,
    });

    expect(discovered).toEqual([
      path.join(tempRoot, 'embeddings-1024d', 'parquet', 'part-0001.parquet'),
    ]);
  });

  it('parses CLI overrides over the base config', () => {
    const parsed = parseCliArgs([
      '--drive-mount', '/drive',
      '--input', '/drive/data/file.jsonl',
      '--limit', '123',
      '--batch-size', '25',
      '--vector-size', '768',
      '--text-limit', '1500',
    ], {
      driveMount: '/default',
      inputPath: undefined,
      collection: 'case-law-holdings',
      qdrantUrl: 'http://localhost:6333',
      limit: 5000,
      batchSize: 100,
      vectorSize: 1024,
      textLimit: 2000,
    });

    expect(parsed).toMatchObject({
      driveMount: '/drive',
      inputPath: '/drive/data/file.jsonl',
      limit: 123,
      batchSize: 25,
      vectorSize: 768,
      textLimit: 1500,
    });
  });
});
