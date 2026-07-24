import { describe, expect, it } from 'vitest';
import { normalizeRegisterSurfaces, segmentRegisterHighlights } from './registerHighlight';

describe('registerHighlight', () => {
  it('dedupes and prefers longer surfaces', () => {
    expect(normalizeRegisterSurfaces(['citizen', 'United States citizen', 'citizen'])).toEqual([
      'United States citizen',
      'citizen',
    ]);
  });

  it('marks lexicon-matched spans as registered', () => {
    const segments = segmentRegisterHighlights(
      'Am I a United States citizen for this filing?',
      ['United States citizen', 'citizen'],
    );
    const registered = segments.filter((s) => s.registered).map((s) => s.text);
    expect(registered).toEqual(['United States citizen']);
    expect(segments.some((s) => !s.registered && s.text.includes('filing'))).toBe(true);
  });

  it('returns plain text when no surfaces match', () => {
    const segments = segmentRegisterHighlights('hello world', ['lien']);
    expect(segments).toEqual([{ text: 'hello world', registered: false }]);
  });
});
