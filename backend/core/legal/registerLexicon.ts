import fs from 'node:fs';
import path from 'node:path';
import {
  RegisterEntrySchema,
  RegisterLexiconSchema,
  type RegisterEntry,
  type RegisterLexicon,
  type RegisterMatchedTerm,
  type RegisterMirrorResult,
  type RegisterSense,
  type RegisterTranslateRequest,
} from '../../../schemas/legalSchemas';
import { getConfig } from '../../config';

type CompiledForm = {
  entry: RegisterEntry;
  form: string;
  pattern: RegExp;
};

let cachedLexicon: RegisterLexicon | null = null;
let cachedPath: string | null = null;
let compiledForms: CompiledForm[] = [];

function resolveLexiconPath(configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }
  return path.resolve(process.cwd(), configuredPath);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileForms(lexicon: RegisterLexicon): CompiledForm[] {
  const compiled: CompiledForm[] = [];
  for (const rawEntry of lexicon.entries) {
    const entry = RegisterEntrySchema.parse(rawEntry);
    for (const form of entry.surface_forms) {
      const normalized = form.trim().toLowerCase();
      if (!normalized) continue;
      compiled.push({
        entry,
        form: normalized,
        pattern: new RegExp(`\\b${escapeRegExp(normalized).replace(/\s+/g, '\\s+')}\\b`, 'i'),
      });
    }
  }
  // Longer surface forms first so "united states citizen" wins over "citizen".
  compiled.sort((a, b) => b.form.length - a.form.length);
  return compiled;
}

export function loadRegisterLexicon(forceReload = false): { lexicon: RegisterLexicon; sourcePath: string } {
  const configured = getConfig().REGISTER_LEXICON_PATH;
  const sourcePath = resolveLexiconPath(configured);

  if (!forceReload && cachedLexicon && cachedPath === sourcePath) {
    return { lexicon: cachedLexicon, sourcePath };
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as unknown;
  const lexicon = RegisterLexiconSchema.parse(raw);
  cachedLexicon = lexicon;
  cachedPath = sourcePath;
  compiledForms = compileForms(lexicon);
  return { lexicon, sourcePath };
}

/** Bump patch segment of semver-ish versions (1.0.0 → 1.0.1). */
export function bumpLexiconPatchVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length >= 3 && parts.every((p) => /^\d+$/.test(p))) {
    const next = [...parts];
    next[2] = String(Number(next[2]) + 1);
    return next.join('.');
  }
  return `${version}+amend.1`;
}

/** Atomic write + cache reload. Used only by human-gated merge. */
export function writeRegisterLexicon(lexicon: RegisterLexicon): { lexicon: RegisterLexicon; sourcePath: string } {
  const parsed = RegisterLexiconSchema.parse(lexicon);
  const sourcePath = resolveLexiconPath(getConfig().REGISTER_LEXICON_PATH);
  const dir = path.dirname(sourcePath);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = `${sourcePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, sourcePath);
  cachedLexicon = parsed;
  cachedPath = sourcePath;
  compiledForms = compileForms(parsed);
  return { lexicon: parsed, sourcePath };
}

function bandSenses(senses: RegisterSense[]): RegisterMatchedTerm['senses_by_band'] {
  const settled: RegisterSense[] = [];
  const institutional: RegisterSense[] = [];
  const contested: RegisterSense[] = [];

  for (const sense of senses) {
    if (sense.epistemic === 'plain') continue;
    if (sense.epistemic === 'settled') settled.push(sense);
    else if (sense.epistemic === 'institutional') institutional.push(sense);
    else if (sense.epistemic === 'contested') contested.push(sense);
  }

  return { settled, institutional, contested };
}

function buildUsageEcho(surface: string, plain: RegisterSense | undefined, hint: string): string {
  const plainDef = plain?.definition ?? 'in an everyday sense';
  return `You used "${surface}" in a way that reads as: ${plainDef} (${hint})`;
}

function confusionNotes(entry: RegisterEntry, lexicon: RegisterLexicon): string[] {
  const notes: string[] = [];
  const byId = new Map(lexicon.entries.map((e) => [e.term_id, e]));
  for (const otherId of entry.confusion_with ?? []) {
    const other = byId.get(otherId);
    if (!other) {
      notes.push(`Often confused with term_id "${otherId}" (not present in this lexicon pack).`);
      continue;
    }
    const settled = other.senses.find((s) => s.epistemic === 'settled' || s.epistemic === 'institutional');
    notes.push(
      `"${entry.term_id}" ↔ "${other.term_id}": ${settled?.definition ?? other.mirror_hint}`,
    );
  }
  return notes;
}

export function translateRegister(input: RegisterTranslateRequest): RegisterMirrorResult {
  const { lexicon, sourcePath } = loadRegisterLexicon();
  const text = input.text;
  const matched: RegisterMatchedTerm[] = [];
  const coveredRanges: Array<{ start: number; end: number }> = [];
  const sourceRefs = new Set<string>();

  for (const compiled of compiledForms) {
    const match = compiled.pattern.exec(text);
    if (!match || match.index === undefined) continue;

    const start = match.index;
    const end = start + match[0].length;
    const overlaps = coveredRanges.some((range) => start < range.end && end > range.start);
    if (overlaps) continue;

    coveredRanges.push({ start, end });
    const entry = compiled.entry;
    const plain = entry.senses.find((s) => s.epistemic === 'plain' || s.register === 'plain');
    const senses_by_band = bandSenses(entry.senses);

    for (const sense of entry.senses) {
      for (const ref of sense.source_refs ?? []) sourceRefs.add(ref);
    }

    matched.push({
      term_id: entry.term_id,
      surface: match[0],
      user_usage_echo: buildUsageEcho(match[0], plain, entry.mirror_hint),
      matrix: entry.matrix,
      plain_sense: plain,
      senses_by_band,
      confusion_notes: confusionNotes(entry, lexicon),
      procedural_reminders: entry.procedural_triggers ?? [],
      mirror_hint: entry.mirror_hint,
      posture: 'mirror_then_distinguish',
    });
  }

  return {
    matched_terms: matched,
    unanswered_spans: [],
    provenance: {
      lexicon_id: lexicon.lexicon_id,
      lexicon_version: lexicon.version,
      source_path: sourcePath,
      source_refs: [...sourceRefs],
    },
  };
}

export function getRegisterLexiconHealth() {
  try {
    const { lexicon, sourcePath } = loadRegisterLexicon();
    return {
      reachable: true,
      lexicon_id: lexicon.lexicon_id,
      version: lexicon.version,
      entry_count: lexicon.entries.length,
      source_path: sourcePath,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Test helper — inject a lexicon without touching disk. */
export function __setRegisterLexiconForTests(lexicon: RegisterLexicon, sourcePath = 'memory://test'): void {
  cachedLexicon = RegisterLexiconSchema.parse(lexicon);
  cachedPath = sourcePath;
  compiledForms = compileForms(cachedLexicon);
}

export function __resetRegisterLexiconCacheForTests(): void {
  cachedLexicon = null;
  cachedPath = null;
  compiledForms = [];
}
