import {
  RegisterEntrySchema,
  RegisterResearchRequestSchema,
  type RegisterEntry,
  type RegisterResearchHit,
  type RegisterResearchRequest,
  type RegisterResearchResult,
  type RegisterSense,
} from '../../../schemas/legalSchemas';
import { loadRegisterLexicon } from './registerLexicon';

function bandSenses(senses: RegisterSense[]): RegisterResearchHit['senses_by_band'] {
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

function titleCase(term: string): string {
  return term
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function slugTermId(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'term';
}

function confusionNotes(entry: RegisterEntry, byId: Map<string, RegisterEntry>): string[] {
  const notes: string[] = [];
  for (const otherId of entry.confusion_with ?? []) {
    const other = byId.get(otherId);
    if (!other) {
      notes.push(`Often confused with term_id "${otherId}" (not in pack).`);
      continue;
    }
    const settled = other.senses.find(
      (s) => s.epistemic === 'settled' || s.epistemic === 'institutional',
    );
    notes.push(`"${entry.term_id}" ↔ "${other.term_id}": ${settled?.definition ?? other.mirror_hint}`);
  }
  return notes;
}

/**
 * Quick research: clarify a single term (orthography-aware) before propose.
 * Does not invent institutional senses — reports pack hits + propose-ready stub notes.
 */
export function researchRegisterTerm(input: RegisterResearchRequest): RegisterResearchResult {
  const parsed = RegisterResearchRequestSchema.parse(input);
  const asGiven = parsed.term.trim();
  const lower = asGiven.toLowerCase();
  const title = titleCase(asGiven);
  const upper = asGiven.toUpperCase();
  // True when the user did not write lowercase — casing may be load-bearing.
  const userCasingMarked = asGiven !== lower;

  const { lexicon, sourcePath } = loadRegisterLexicon();
  const byId = new Map(lexicon.entries.map((e) => [e.term_id, RegisterEntrySchema.parse(e)]));

  const hits: RegisterResearchHit[] = [];
  for (const entry of byId.values()) {
    const matchingSurfaces = entry.surface_forms.filter(
      (f) => f.trim().toLowerCase() === lower,
    );
    if (matchingSurfaces.length === 0) continue;

    const exactCaseMatch = matchingSurfaces.some((f) => f === asGiven);
    hits.push({
      term_id: entry.term_id,
      surface_forms: entry.surface_forms,
      exact_case_match: exactCaseMatch,
      matrix: entry.matrix,
      mirror_hint: entry.mirror_hint,
      senses_by_band: bandSenses(entry.senses),
      confusion_notes: confusionNotes(entry, byId),
    });
  }

  const inLexicon = hits.length > 0;
  const packHasExact = hits.some((h) => h.exact_case_match);
  const packHasOtherCase = hits.some((h) =>
    h.surface_forms.some((f) => f.toLowerCase() === lower && f !== asGiven),
  );

  let caseGapNoted = false;
  let caseGapDetail = 'No orthography gap flagged.';
  if (inLexicon && !packHasExact && packHasOtherCase) {
    caseGapNoted = true;
    caseGapDetail =
      `You asked about "${asGiven}" but the pack only has a different casing for this token. ` +
      `If context shows distinct institutional meanings by case (e.g. Minor vs minor), treat that as a propose/amend gap — do not collapse them.`;
  } else if (!inLexicon && userCasingMarked) {
    caseGapNoted = true;
    caseGapDetail =
      `Term not in lexicon. You used marked casing ("${asGiven}" vs "${lower}"). ` +
      `If your source uses more than one casing with different meanings, propose separate surface forms or separate term_ids after clarifying each sense.`;
  } else if (inLexicon && packHasExact && userCasingMarked) {
    caseGapDetail =
      `Exact casing "${asGiven}" is present in the pack. Still verify whether other casings in your source carry a different institutional sense.`;
  }

  const senseCount = hits.reduce(
    (n, h) =>
      n
      + h.senses_by_band.settled.length
      + h.senses_by_band.institutional.length
      + h.senses_by_band.contested.length,
    0,
  );

  let clarity_summary: string;
  if (inLexicon) {
    clarity_summary =
      `Found ${hits.length} lexicon entry(ies) for "${asGiven}" with ${senseCount} non-plain sense(s). ` +
      (caseGapNoted ? caseGapDetail : 'Present the settled/institutional senses; mirror the user\'s casing.');
  } else {
    clarity_summary =
      `No lexicon entry for "${asGiven}". Clarify from the user\'s source context first, then propose a stub — do not invent settled senses without a cite.`;
  }

  const suggestedSurfaces = userCasingMarked
    ? Array.from(new Set([asGiven, lower].filter(Boolean)))
    : [asGiven];

  const propose_ready = {
    recommended: !inLexicon || caseGapNoted,
    mode: (inLexicon ? 'amend' : 'create') as 'create' | 'amend',
    suggested_term_id: inLexicon ? hits[0]!.term_id : slugTermId(asGiven),
    suggested_surface_forms: inLexicon
      ? Array.from(new Set([...hits[0]!.surface_forms, ...suggestedSurfaces]))
      : suggestedSurfaces,
    stub_notes: inLexicon
      ? `Amend after clarifying whether "${asGiven}" needs its own sense distinct from existing casings. Context: ${parsed.context ?? '(none)'}. Hint: ${parsed.corpus_hint ?? '(none)'}.`
      : `Create after extracting plain + institutional/settled senses from source. Preserve casing. Context: ${parsed.context ?? '(none)'}. Corpus hint: ${parsed.corpus_hint ?? '(none)'}.`,
  };

  return {
    query_term: asGiven,
    context: parsed.context,
    corpus_hint: parsed.corpus_hint,
    orthography: {
      as_given: asGiven,
      lower,
      title,
      upper,
      case_variants_differ: userCasingMarked || caseGapNoted,
    },
    in_lexicon: inLexicon,
    hits,
    case_gap: { noted: caseGapNoted, detail: caseGapDetail },
    clarity_summary,
    propose_ready,
    posture: 'clarify_before_propose',
    provenance: {
      lexicon_id: lexicon.lexicon_id,
      lexicon_version: lexicon.version,
      source_path: sourcePath,
    },
  };
}
