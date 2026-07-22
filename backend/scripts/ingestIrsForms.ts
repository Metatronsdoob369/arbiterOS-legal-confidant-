/**
 * Ingest TrevorJS/irs-forms into:
 * - committed metadata index (previews)
 * - local SQLite full text (gitignored under data/)
 *
 * Usage:
 *   npm run ingest:irs-forms
 *   npm run ingest:irs-forms -- --jsonl data/docs-cache/irs-forms.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import {
  DocsCatalogEntrySchema,
  DocsCatalogIndexSchema,
  type DocsCatalogEntry,
  type DocsEntryKind,
} from '../../schemas/legalSchemas';

const HF_PARQUET_URL =
  'https://huggingface.co/datasets/TrevorJS/irs-forms/resolve/main/data/train-00000-of-00001.parquet';
const DEFAULT_PARQUET = 'data/docs-cache/irs-forms.parquet';
const DEFAULT_JSONL = 'data/docs-cache/irs-forms.jsonl';
const INDEX_OUT = 'backend/core/legal/seeds/docs/irs_treasury/catalogs/irs_forms.index.json';
const MODULE_PATH = 'backend/core/legal/seeds/docs/irs_treasury/module.json';
const FULLTEXT_DB = 'data/docs/irs_forms.sqlite';
const PREVIEW_CHARS = 400;
const SOURCE = 'TrevorJS/irs-forms';

function resolveArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function inferKind(fileName: string): DocsEntryKind {
  const base = path.basename(fileName).toLowerCase();
  if (base.startsWith('i')) return 'instruction';
  if (base.startsWith('p')) return 'publication';
  if (base.startsWith('f')) return 'form';
  return 'other';
}

async function ensureParquet(parquetPath: string): Promise<void> {
  if (fs.existsSync(parquetPath) && fs.statSync(parquetPath).size > 1_000_000) {
    return;
  }
  fs.mkdirSync(path.dirname(parquetPath), { recursive: true });
  console.log(`Downloading ${HF_PARQUET_URL}`);
  const response = await fetch(HF_PARQUET_URL);
  if (!response.ok) {
    throw new Error(`Failed to download parquet: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(parquetPath, buffer);
  console.log(`Saved ${parquetPath} (${buffer.length} bytes)`);
}

function ensureJsonl(parquetPath: string, jsonlPath: string): void {
  if (fs.existsSync(jsonlPath) && fs.statSync(jsonlPath).size > 1_000_000) {
    return;
  }
  const converter = path.resolve(process.cwd(), 'backend/scripts/parquet_to_jsonl.py');
  const result = spawnSync(
    'conda',
    ['run', '-n', 'agents', 'python', converter, '--parquet', parquetPath, '--out', jsonlPath],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `parquet→jsonl failed:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    );
  }
  console.log(result.stdout.trim());
}

function readJsonl(jsonlPath: string): Array<Record<string, unknown>> {
  const lines = fs.readFileSync(jsonlPath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function writeFullTextDb(dbPath: string, entries: Array<{ entry_id: string; full_text: string }>) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE entries (
      entry_id TEXT PRIMARY KEY,
      full_text TEXT NOT NULL
    );
  `);
  const insert = db.prepare('INSERT INTO entries (entry_id, full_text) VALUES (?, ?)');
  const tx = db.transaction((rows: Array<{ entry_id: string; full_text: string }>) => {
    for (const row of rows) {
      insert.run(row.entry_id, row.full_text);
    }
  });
  tx(entries);
  db.close();
}

async function main() {
  const parquetPath = path.resolve(process.cwd(), resolveArg('--parquet') ?? DEFAULT_PARQUET);
  const jsonlPath = path.resolve(process.cwd(), resolveArg('--jsonl') ?? DEFAULT_JSONL);
  const indexOut = path.resolve(process.cwd(), resolveArg('--out') ?? INDEX_OUT);
  const fulltextDb = path.resolve(process.cwd(), resolveArg('--db') ?? FULLTEXT_DB);

  if (!fs.existsSync(jsonlPath)) {
    await ensureParquet(parquetPath);
    ensureJsonl(parquetPath, jsonlPath);
  }

  const rows = readJsonl(jsonlPath);
  console.log(`Read ${rows.length} jsonl rows`);

  const catalogEntries: DocsCatalogEntry[] = [];
  const fullTextRows: Array<{ entry_id: string; full_text: string }> = [];

  for (const row of rows) {
    const fileName = String(row.file_name ?? '').trim();
    const description = String(row.description ?? '').trim();
    const url = String(row.url ?? '').trim();
    if (!fileName || !description || !url) {
      continue;
    }

    const fullText = String(row.text ?? '').replace(/\s+/g, ' ').trim();
    const entryId = `irs:${fileName.toLowerCase()}`;
    const entry = DocsCatalogEntrySchema.parse({
      entry_id: entryId,
      department_id: 'irs_treasury',
      catalog_id: 'irs_forms',
      file_name: fileName,
      title: description,
      official_url: url,
      kind: inferKind(fileName),
      text_preview: fullText.slice(0, PREVIEW_CHARS),
      source: SOURCE,
    });
    catalogEntries.push(entry);
    fullTextRows.push({ entry_id: entryId, full_text: fullText });
  }

  const index = DocsCatalogIndexSchema.parse({
    catalog_id: 'irs_forms',
    department_id: 'irs_treasury',
    title: 'IRS Forms & Publications',
    source: SOURCE,
    ingested_at: new Date().toISOString(),
    entry_count: catalogEntries.length,
    entries: catalogEntries,
  });

  fs.mkdirSync(path.dirname(indexOut), { recursive: true });
  fs.writeFileSync(indexOut, `${JSON.stringify(index)}\n`, 'utf8');
  writeFullTextDb(fulltextDb, fullTextRows);

  const modulePath = path.resolve(process.cwd(), MODULE_PATH);
  const moduleJson = JSON.parse(fs.readFileSync(modulePath, 'utf8')) as {
    catalogs: Array<Record<string, unknown>>;
  };
  moduleJson.catalogs = moduleJson.catalogs.map((catalog) =>
    catalog.catalog_id === 'irs_forms'
      ? { ...catalog, entry_count: catalogEntries.length, status: 'populated' }
      : catalog,
  );
  fs.writeFileSync(modulePath, `${JSON.stringify(moduleJson, null, 2)}\n`, 'utf8');

  console.log(`Wrote index: ${indexOut} (${catalogEntries.length} entries)`);
  console.log(`Wrote full text: ${fulltextDb}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
