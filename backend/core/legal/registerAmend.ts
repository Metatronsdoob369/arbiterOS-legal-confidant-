import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  RegisterEntrySchema,
  RegisterProposalSchema,
  RegisterProposeRequestSchema,
  type RegisterEntry,
  type RegisterProposal,
  type RegisterProposeRequest,
} from '../../../schemas/legalSchemas';
import { getConfig } from '../../config';
import {
  bumpLexiconPatchVersion,
  loadRegisterLexicon,
  writeRegisterLexicon,
} from './registerLexicon';

function resolveProposalsDir(): string {
  const configured = getConfig().REGISTER_PROPOSALS_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function proposalPath(id: string): string {
  return path.join(resolveProposalsDir(), `${id}.json`);
}

function ensureProposalsDir(): string {
  const dir = resolveProposalsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readProposal(id: string): RegisterProposal {
  const fullPath = proposalPath(id);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Register proposal not found: ${id}`);
  }
  return RegisterProposalSchema.parse(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
}

function writeProposal(proposal: RegisterProposal): RegisterProposal {
  ensureProposalsDir();
  const parsed = RegisterProposalSchema.parse(proposal);
  fs.writeFileSync(proposalPath(parsed.id), `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return parsed;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function proposeRegisterEntry(input: RegisterProposeRequest): RegisterProposal {
  const parsed = RegisterProposeRequestSchema.parse(input);
  const entry = RegisterEntrySchema.parse(parsed.entry);
  const created = nowIso();
  const proposal: RegisterProposal = {
    id: `prop_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    status: 'pending',
    mode: parsed.mode,
    created_at: created,
    updated_at: created,
    trigger_text: parsed.trigger_text,
    notes: parsed.notes,
    entry,
  };
  return writeProposal(proposal);
}

export function listRegisterProposals(filter?: { status?: RegisterProposal['status'] }): RegisterProposal[] {
  const dir = ensureProposalsDir();
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
  const proposals = files
    .map((name) => {
      try {
        return RegisterProposalSchema.parse(
          JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')),
        );
      } catch {
        return null;
      }
    })
    .filter((p): p is RegisterProposal => p !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (!filter?.status) return proposals;
  return proposals.filter((p) => p.status === filter.status);
}

function applyEntryToLexicon(
  entries: RegisterEntry[],
  entry: RegisterEntry,
  mode: RegisterProposal['mode'],
): RegisterEntry[] {
  const idx = entries.findIndex((e) => e.term_id === entry.term_id);
  if (mode === 'amend') {
    if (idx < 0) {
      throw new Error(`Cannot amend missing term_id "${entry.term_id}" — use mode create`);
    }
    const next = [...entries];
    next[idx] = entry;
    return next;
  }
  if (idx >= 0) {
    throw new Error(`term_id "${entry.term_id}" already exists — use mode amend`);
  }
  return [...entries, entry];
}

export function mergeRegisterProposal(id: string): {
  proposal: RegisterProposal;
  lexicon: ReturnType<typeof writeRegisterLexicon>['lexicon'];
  sourcePath: string;
} {
  const proposal = readProposal(id);
  if (proposal.status !== 'pending') {
    throw new Error(`Register proposal ${id} is not pending (status=${proposal.status})`);
  }

  const { lexicon } = loadRegisterLexicon(true);
  const nextEntries = applyEntryToLexicon(lexicon.entries, proposal.entry, proposal.mode);
  const nextVersion = bumpLexiconPatchVersion(lexicon.version);
  const written = writeRegisterLexicon({
    ...lexicon,
    version: nextVersion,
    entries: nextEntries,
  });

  const merged = writeProposal({
    ...proposal,
    status: 'merged',
    updated_at: nowIso(),
    merged_into_version: nextVersion,
  });

  return { proposal: merged, lexicon: written.lexicon, sourcePath: written.sourcePath };
}

export function rejectRegisterProposal(id: string, reason?: string): RegisterProposal {
  const proposal = readProposal(id);
  if (proposal.status !== 'pending') {
    throw new Error(`Register proposal ${id} is not pending (status=${proposal.status})`);
  }
  return writeProposal({
    ...proposal,
    status: 'rejected',
    updated_at: nowIso(),
    reject_reason: reason?.trim() || 'rejected',
  });
}

export function getRegisterProposal(id: string): RegisterProposal {
  return readProposal(id);
}
