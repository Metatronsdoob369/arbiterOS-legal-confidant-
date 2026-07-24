import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../../../config';
import {
  ColdMapConsultRequestSchema,
  ColdMapConsultResultSchema,
  ColdMapEntrySchema,
  type ColdMapConsultRequest,
  type ColdMapConsultResult,
  type ColdMapEntry,
} from '../../../../schemas/legalSchemas';

let cachedEntries: ColdMapEntry[] | null = null;
let cachedDir: string | null = null;

function resolveColdMapDir(configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }
  return path.resolve(process.cwd(), configuredPath);
}

export function getColdMapDir(): string {
  return resolveColdMapDir(getConfig().PCON_COLD_MAP_DIR);
}

export function loadColdMapEntries(forceReload = false): { entries: ColdMapEntry[]; sourceDir: string } {
  const sourceDir = getColdMapDir();
  if (!forceReload && cachedEntries && cachedDir === sourceDir) {
    return { entries: cachedEntries, sourceDir };
  }

  const entriesDir = path.join(sourceDir, 'entries');
  if (!fs.existsSync(entriesDir)) {
    cachedEntries = [];
    cachedDir = sourceDir;
    return { entries: [], sourceDir };
  }

  const entries: ColdMapEntry[] = [];
  for (const name of fs.readdirSync(entriesDir).sort()) {
    if (!name.endsWith('.json')) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(entriesDir, name), 'utf8')) as unknown;
    entries.push(ColdMapEntrySchema.parse(raw));
  }

  cachedEntries = entries;
  cachedDir = sourceDir;
  return { entries, sourceDir };
}

function scoreEntry(query: string, entry: ColdMapEntry): number {
  const q = query.toLowerCase();
  const hay = [
    entry.failure_id,
    entry.surface,
    entry.kind,
    entry.why_static,
    entry.corrective_pointer ?? '',
    entry.epistemic_note ?? '',
    ...(entry.source_refs ?? []),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const token of q.split(/[^a-z0-9]+/i).filter((t) => t.length > 2)) {
    if (hay.includes(token)) score += token.length >= 6 ? 2 : 1;
  }
  if (hay.includes(q.trim()) && q.trim().length > 4) score += 5;
  return score;
}

export function consultColdMap(input: ColdMapConsultRequest): ColdMapConsultResult {
  const parsed = ColdMapConsultRequestSchema.parse(input);
  const { entries, sourceDir } = loadColdMapEntries();
  const active = entries.filter((e) => e.status === 'active');

  const ranked = active
    .map((entry) => ({ entry, score: scoreEntry(parsed.query, entry) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, parsed.limit)
    .map((row) => row.entry);

  // If nothing matched tokens, still return top active burns so loyal opposition has fuel.
  const hits =
    ranked.length > 0
      ? ranked
      : active.slice(0, Math.min(2, parsed.limit));

  return ColdMapConsultResultSchema.parse({
    query: parsed.query,
    hits,
    posture: 'negative_cartography',
    provenance: {
      source_dir: sourceDir,
      entry_count: active.length,
      matched: ranked.length > 0,
    },
  });
}

export function getColdMapHealth(): {
  reachable: boolean;
  entry_count: number;
  active_count: number;
  source_dir: string;
  error?: string;
} {
  try {
    const { entries, sourceDir } = loadColdMapEntries(true);
    return {
      reachable: true,
      entry_count: entries.length,
      active_count: entries.filter((e) => e.status === 'active').length,
      source_dir: sourceDir,
    };
  } catch (error) {
    return {
      reachable: false,
      entry_count: 0,
      active_count: 0,
      source_dir: getColdMapDir(),
      error: error instanceof Error ? error.message : 'Cold map load failed',
    };
  }
}
