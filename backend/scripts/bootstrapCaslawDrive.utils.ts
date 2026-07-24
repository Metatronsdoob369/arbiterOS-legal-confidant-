import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_DRIVE_MOUNT = '/mnt/gdrive/Caselaw';
export const DEFAULT_VECTOR_SIZE = 1024;
export const DEFAULT_TEXT_LIMIT = 2000;
export const SUPPORTED_DATA_EXTENSIONS = new Set([
  '.json',
  '.jsonl',
  '.ndjson',
  '.parquet',
]);

export interface CaslawBootstrapConfig {
  driveMount: string;
  inputPath?: string;
  collection: string;
  qdrantUrl: string;
  limit: number;
  batchSize: number;
  vectorSize: number;
  textLimit: number;
}

export interface NormalizedCaslawRecord {
  id: number | string;
  vector: number[];
  payload: {
    text: string;
    court_level: string | null;
    decision_date: string | null;
    treatment: string;
    statute_refs: string[];
    source_path?: string;
  };
}

export function buildDefaultConfig(): CaslawBootstrapConfig {
  return {
    driveMount: process.env.CASLAW_DRIVE_MOUNT ?? DEFAULT_DRIVE_MOUNT,
    inputPath: process.env.CASLAW_INPUT_PATH,
    collection: process.env.CASLAW_COLLECTION ?? 'case-law-holdings',
    qdrantUrl: process.env.CASLAW_QDRANT_URL ?? 'http://localhost:6333',
    limit: Number(process.env.CASLAW_LIMIT ?? 5000),
    batchSize: Number(process.env.CASLAW_BATCH_SIZE ?? 100),
    vectorSize: Number(process.env.CASLAW_VECTOR_SIZE ?? DEFAULT_VECTOR_SIZE),
    textLimit: Number(process.env.CASLAW_TEXT_LIMIT ?? DEFAULT_TEXT_LIMIT),
  };
}

export function parseCliArgs(argv: string[], base = buildDefaultConfig()): CaslawBootstrapConfig {
  const config = { ...base };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case '--drive-mount':
        config.driveMount = next;
        index += 1;
        break;
      case '--input':
        config.inputPath = next;
        index += 1;
        break;
      case '--collection':
        config.collection = next;
        index += 1;
        break;
      case '--qdrant-url':
        config.qdrantUrl = next;
        index += 1;
        break;
      case '--limit':
        config.limit = Number(next);
        index += 1;
        break;
      case '--batch-size':
        config.batchSize = Number(next);
        index += 1;
        break;
      case '--vector-size':
        config.vectorSize = Number(next);
        index += 1;
        break;
      case '--text-limit':
        config.textLimit = Number(next);
        index += 1;
        break;
      default:
        break;
    }
  }

  return config;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildStableUuid(seed: string): string {
  const digest = createHash('sha256').update(seed).digest('hex');
  const hex = digest.slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

export function toQdrantPointId(rawId: unknown): number | string {
  if (typeof rawId === 'number' && Number.isSafeInteger(rawId) && rawId >= 0) {
    return rawId;
  }

  if (typeof rawId === 'string') {
    const trimmed = rawId.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isSafeInteger(parsed)) {
        return parsed;
      }
    }
    if (isUuid(trimmed)) {
      return trimmed.toLowerCase();
    }
    return buildStableUuid(trimmed);
  }

  return buildStableUuid(JSON.stringify(rawId));
}

function normalizeStatuteRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n;]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function extractString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function coerceEmbedding(rawVector: unknown, vectorSize: number): number[] {
  const vector = Array.isArray(rawVector)
    ? rawVector
    : typeof rawVector === 'string'
      ? JSON.parse(rawVector) as unknown
      : rawVector;

  if (!Array.isArray(vector)) {
    throw new Error('Embedding is not an array');
  }

  const normalized = vector.map((value) => Number(value));
  if (normalized.length !== vectorSize) {
    throw new Error(`Embedding length ${normalized.length} does not match expected vector size ${vectorSize}`);
  }
  if (normalized.some((value) => !Number.isFinite(value))) {
    throw new Error('Embedding contains non-finite values');
  }

  return normalized;
}

export function normalizeCaslawRecord(
  record: Record<string, unknown>,
  options: {
    vectorSize?: number;
    textLimit?: number;
    sourcePath?: string;
  } = {},
): NormalizedCaslawRecord {
  const vectorSize = options.vectorSize ?? DEFAULT_VECTOR_SIZE;
  const textLimit = options.textLimit ?? DEFAULT_TEXT_LIMIT;
  const rawId = record.id ?? record.case_id ?? record.opinion_id ?? record.doc_id ?? record.uuid;
  if (rawId === undefined || rawId === null) {
    throw new Error('Record is missing an id field');
  }

  const rawVector = record.embedding ?? record.embeddings ?? record.vector;
  if (rawVector === undefined || rawVector === null) {
    throw new Error('Record is missing an embedding field');
  }

  const text = extractString(record, ['text', 'opinion_text', 'holding_text', 'excerpt', 'body', 'content']) ?? '';
  const payloadText = text.slice(0, textLimit);
  const courtLevel = extractString(record, ['court_level', 'courtLevel', 'court']);
  const decisionDate = extractString(record, ['decision_date', 'decisionDate', 'date']);
  const treatment = extractString(record, ['treatment']) ?? 'neutral';
  const statuteRefs = normalizeStatuteRefs(record.statute_refs ?? record.statuteRefs);

  return {
    id: toQdrantPointId(rawId),
    vector: coerceEmbedding(rawVector, vectorSize),
    payload: {
      text: payloadText,
      court_level: courtLevel,
      decision_date: decisionDate,
      treatment,
      statute_refs: statuteRefs,
      ...(options.sourcePath ? { source_path: options.sourcePath } : {}),
    },
  };
}

function walkDataFiles(rootPath: string, acc: string[]) {
  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    if (SUPPORTED_DATA_EXTENSIONS.has(path.extname(rootPath).toLowerCase())) {
      acc.push(rootPath);
    }
    return;
  }

  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      walkDataFiles(fullPath, acc);
      continue;
    }
    if (SUPPORTED_DATA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      acc.push(fullPath);
    }
  }
}

export function discoverCaslawDataFiles(config: Pick<CaslawBootstrapConfig, 'driveMount' | 'inputPath'>): string[] {
  const candidates = config.inputPath
    ? [config.inputPath]
    : [
        path.join(config.driveMount, 'embeddings-1024d', 'parquet'),
        path.join(config.driveMount, 'embeddings-1024d'),
        path.join(config.driveMount, 'caselaw_access_project'),
        config.driveMount,
      ];

  const found = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) {
      continue;
    }
    const acc: string[] = [];
    walkDataFiles(candidate, acc);
    for (const filePath of acc) {
      found.add(filePath);
    }
    if (found.size > 0 && config.inputPath) {
      break;
    }
  }

  return Array.from(found).sort();
}
