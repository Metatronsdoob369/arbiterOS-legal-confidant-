/**
 * Split plain text into segments, marking spans already matched by the Register Lexicon.
 * Longest surfaces win so "United States citizen" beats "citizen".
 */

export type RegisterTextSegment = {
  text: string;
  registered: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeRegisterSurfaces(surfaces: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of surfaces) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  unique.sort((a, b) => b.length - a.length);
  return unique;
}

export function segmentRegisterHighlights(
  text: string,
  surfaces: string[],
): RegisterTextSegment[] {
  const forms = normalizeRegisterSurfaces(surfaces);
  if (!text || forms.length === 0) {
    return text ? [{ text, registered: false }] : [];
  }

  const pattern = new RegExp(
    `(${forms.map((f) => escapeRegExp(f).replace(/\s+/g, '\\s+')).join('|')})`,
    'gi',
  );

  const segments: RegisterTextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match) {
    const start = match.index;
    const matched = match[0];
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), registered: false });
    }
    segments.push({ text: matched, registered: true });
    lastIndex = start + matched.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), registered: false });
  }

  return segments.length > 0 ? segments : [{ text, registered: false }];
}
