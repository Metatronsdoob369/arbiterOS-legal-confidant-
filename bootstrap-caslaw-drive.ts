import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {
  buildDefaultConfig,
  discoverCaslawDataFiles,
  normalizeCaslawRecord,
  parseCliArgs,
  type CaslawBootstrapConfig,
  type NormalizedCaslawRecord,
} from './backend/scripts/bootstrapCaslawDrive.utils.ts';

type RawRecord = Record<string, unknown>;
type QdrantCollectionInfo = {
  points_count?: number;
};

type ParquetModule = {
  ParquetReader: {
    openFile(filePath: string): Promise<{
      getCursor(): Promise<{
        next(): Promise<RawRecord | null>;
      }>;
      close(): Promise<void>;
    }>;
  };
};

function buildQdrantUrl(baseUrl: string, route: string): string {
  return new URL(route, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

async function qdrantRequest<T>(
  config: CaslawBootstrapConfig,
  route: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildQdrantUrl(config.qdrantUrl, route), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Qdrant ${init?.method ?? 'GET'} ${route} failed with ${response.status}`);
  }

  return await response.json() as T;
}

async function getCollectionInfo(
  config: CaslawBootstrapConfig,
): Promise<QdrantCollectionInfo | null> {
  const response = await fetch(buildQdrantUrl(config.qdrantUrl, `/collections/${config.collection}`));
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Qdrant GET /collections/${config.collection} failed with ${response.status}`);
  }

  const body = await response.json() as { result?: QdrantCollectionInfo };
  return body.result ?? null;
}

async function ensureCollection(config: CaslawBootstrapConfig) {
  const collection = await getCollectionInfo(config);
  if (!collection) {
    await qdrantRequest(config, `/collections/${config.collection}`, {
      method: 'PUT',
      body: JSON.stringify({
      vectors: {
        size: config.vectorSize,
        distance: 'Cosine',
      },
      }),
    });
    console.log(`[caslaw-drive] Created collection ${config.collection}`);
  }
}

async function* readJsonlRecords(filePath: string): AsyncGenerator<RawRecord> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      yield JSON.parse(trimmed) as RawRecord;
    }
  } finally {
    rl.close();
    stream.close();
  }
}

async function* readJsonRecords(filePath: string): AsyncGenerator<RawRecord> {
  const raw = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === 'object') {
        yield entry as RawRecord;
      }
    }
    return;
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as { records?: unknown }).records)) {
    for (const entry of (raw as { records: unknown[] }).records) {
      if (entry && typeof entry === 'object') {
        yield entry as RawRecord;
      }
    }
    return;
  }

  throw new Error(`Unsupported JSON shape in ${filePath}`);
}

let cachedParquetModule: ParquetModule | null = null;

async function getParquetModule(): Promise<ParquetModule> {
  if (cachedParquetModule) {
    return cachedParquetModule;
  }

  cachedParquetModule = await import('parquetjs-lite') as unknown as ParquetModule;
  return cachedParquetModule;
}

async function* readParquetRecords(filePath: string): AsyncGenerator<RawRecord> {
  const parquet = await getParquetModule();
  const reader = await parquet.ParquetReader.openFile(filePath);
  try {
    const cursor = await reader.getCursor();
    for (;;) {
      const row = await cursor.next();
      if (!row) {
        break;
      }
      yield row;
    }
  } finally {
    await reader.close();
  }
}

async function* readRecords(filePath: string): AsyncGenerator<RawRecord> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.jsonl' || extension === '.ndjson') {
    yield* readJsonlRecords(filePath);
    return;
  }
  if (extension === '.json') {
    yield* readJsonRecords(filePath);
    return;
  }
  if (extension === '.parquet') {
    yield* readParquetRecords(filePath);
    return;
  }
  throw new Error(`Unsupported input file: ${filePath}`);
}

async function flushBatch(
  config: CaslawBootstrapConfig,
  batch: NormalizedCaslawRecord[],
) {
  if (batch.length === 0) {
    return;
  }

  await qdrantRequest(config, `/collections/${config.collection}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({
      points: batch,
    }),
  });
}

async function bootstrapFromDrive(config: CaslawBootstrapConfig) {
  await ensureCollection(config);

  const files = discoverCaslawDataFiles(config);
  if (files.length === 0) {
    throw new Error(`No supported data files found under ${config.inputPath ?? config.driveMount}`);
  }

  console.log(`[caslaw-drive] Found ${files.length} input file(s)`);

  const batch: NormalizedCaslawRecord[] = [];
  let scanned = 0;
  let upserted = 0;
  let skipped = 0;

  for (const filePath of files) {
    console.log(`[caslaw-drive] Reading ${filePath}`);
    for await (const rawRecord of readRecords(filePath)) {
      if (upserted >= config.limit) {
        break;
      }

      scanned += 1;
      try {
        const normalized = normalizeCaslawRecord(rawRecord, {
          vectorSize: config.vectorSize,
          textLimit: config.textLimit,
          sourcePath: filePath,
        });
        batch.push(normalized);
      } catch (error) {
        skipped += 1;
        if (skipped <= 5) {
          console.warn(`[caslaw-drive] Skipping record ${scanned}: ${(error as Error).message}`);
        }
        continue;
      }

      if (batch.length >= config.batchSize) {
        await flushBatch(config, batch);
        upserted += batch.length;
        batch.length = 0;
        console.log(`[caslaw-drive] Upserted ${upserted} record(s)`);
      }
    }

    if (upserted >= config.limit) {
      break;
    }
  }

  await flushBatch(config, batch);
  upserted += batch.length;

  const collectionInfo = await getCollectionInfo(config);
  console.log('[caslaw-drive] Bootstrap complete', {
    scanned,
    upserted,
    skipped,
    collection: config.collection,
    pointsCount: collectionInfo?.points_count ?? 0,
  });
}

const config = parseCliArgs(process.argv.slice(2), buildDefaultConfig());

bootstrapFromDrive(config).catch((error) => {
  console.error('[caslaw-drive] Bootstrap failed', error);
  process.exitCode = 1;
});
