/**
 * Silence-First Philosophy Contract v1
 *
 * Portable envelope for authority retrieval. Engines (law corpus, common-law,
 * WhiteGlove SimHash) emit this shape; products refuse invented cites when silenced.
 *
 * Machine twin: docs/contracts/silence-first.v1.schema.json
 * Philosophy: docs/contracts/silence-first.v1.md
 */

import { z } from 'zod';

export const SILENCE_FIRST_CONTRACT_VERSION = '1.0' as const;

export const AuthorityKindSchema = z.enum([
  'statute',
  'holding',
  'corpus_shard',
  'working_set',
  'register',
]);
export type AuthorityKind = z.infer<typeof AuthorityKindSchema>;

export const SilencePolicySchema = z.enum(['strict', 'permissive']);
export type SilencePolicy = z.infer<typeof SilencePolicySchema>;

export const SilenceMetricSchema = z.enum([
  'hamming_ratio',
  'cosine',
  'strength',
  'unknown',
]);
export type SilenceMetric = z.infer<typeof SilenceMetricSchema>;

/** Normative retrieval result — philosophy exchange artifact. */
export const SilenceFirstResultSchema = z.object({
  contract_version: z.literal(SILENCE_FIRST_CONTRACT_VERSION),
  authority_kind: AuthorityKindSchema,
  silence_policy: SilencePolicySchema,
  found: z.boolean(),
  silenced: z.boolean(),
  reason: z.string().min(1),
  score: z.number().optional(),
  metric: SilenceMetricSchema.optional(),
  citation: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  provenance: z.string().optional(),
});
export type SilenceFirstResult = z.infer<typeof SilenceFirstResultSchema>;

/** Holding strength bands used by common-law lane → optional numeric score. */
export const HOLDING_STRENGTH_SCORE: Record<'weak' | 'moderate' | 'strong', number> = {
  weak: 0.33,
  moderate: 0.66,
  strong: 1.0,
};

/**
 * Build a citeable (non-silenced) result.
 */
export function silenceFirstHit(input: {
  authority_kind: AuthorityKind;
  silence_policy?: SilencePolicy;
  reason: string;
  score?: number;
  metric?: SilenceMetric;
  citation?: string;
  title?: string;
  text?: string;
  provenance?: string;
}): SilenceFirstResult {
  return SilenceFirstResultSchema.parse({
    contract_version: SILENCE_FIRST_CONTRACT_VERSION,
    authority_kind: input.authority_kind,
    silence_policy: input.silence_policy ?? 'strict',
    found: true,
    silenced: false,
    reason: input.reason,
    score: input.score,
    metric: input.metric,
    citation: input.citation,
    title: input.title,
    text: input.text,
    provenance: input.provenance,
  });
}

/**
 * Build a silenced result (no inventable authority).
 */
export function silenceFirstSilent(input: {
  authority_kind: AuthorityKind;
  silence_policy?: SilencePolicy;
  reason: string;
  found?: boolean;
  score?: number;
  metric?: SilenceMetric;
  provenance?: string;
}): SilenceFirstResult {
  return SilenceFirstResultSchema.parse({
    contract_version: SILENCE_FIRST_CONTRACT_VERSION,
    authority_kind: input.authority_kind,
    silence_policy: input.silence_policy ?? 'strict',
    found: input.found ?? false,
    silenced: true,
    reason: input.reason,
    score: input.score,
    metric: input.metric,
    provenance: input.provenance,
  });
}

/**
 * Map common-law holding strength to envelope fields.
 * Empty holdings ⇒ silenced. Weak-only under strict ⇒ silenced for hard claims.
 */
export function holdingsToSilenceEnvelope(input: {
  holdings: Array<{ strength?: 'weak' | 'moderate' | 'strong'; citation?: string; holding?: string; title?: string; id?: string }>;
  silence_policy?: SilencePolicy;
  provenance?: string;
}): SilenceFirstResult {
  const policy = input.silence_policy ?? 'strict';
  const holdings = input.holdings ?? [];

  if (holdings.length === 0) {
    return silenceFirstSilent({
      authority_kind: 'holding',
      silence_policy: policy,
      reason: 'No holdings matched the query (corpus silent).',
      found: false,
      metric: 'strength',
      provenance: input.provenance,
    });
  }

  const best = holdings.reduce((a, b) => {
    const sa = HOLDING_STRENGTH_SCORE[a.strength ?? 'weak'] ?? 0;
    const sb = HOLDING_STRENGTH_SCORE[b.strength ?? 'weak'] ?? 0;
    return sb >= sa ? b : a;
  });

  const score = HOLDING_STRENGTH_SCORE[best.strength ?? 'weak'] ?? 0;
  const weakOnly = holdings.every((h) => (h.strength ?? 'weak') === 'weak');

  if (policy === 'strict' && weakOnly) {
    return silenceFirstSilent({
      authority_kind: 'holding',
      silence_policy: policy,
      reason: 'Only weak holdings matched; strict policy silences hard claims.',
      found: true,
      score,
      metric: 'strength',
      provenance: input.provenance,
    });
  }

  return silenceFirstHit({
    authority_kind: 'holding',
    silence_policy: policy,
    reason: `Best holding strength: ${best.strength ?? 'weak'}.`,
    score,
    metric: 'strength',
    citation: best.citation,
    title: best.title,
    text: best.holding,
    provenance: input.provenance ?? best.id,
  });
}
