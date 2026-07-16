export interface SeedHolding {
  id: string;
  title: string;
  citation: string;
  holding: string;
  statute: string;
  jurisdiction: string;
  court: string;
  year: number;
  source: string;
  treatment: 'supports' | 'distinguishes' | 'limits';
  keywords: string[];
}

export const COMMON_LAW_SEED_HOLDINGS: SeedHolding[] = [
  {
    id: 'clh-ucc-3-104-unconditional-promise',
    title: 'Negotiability requires an unconditional promise',
    citation: 'Seed Common Law § UCC 3-104 / unconditional promise',
    holding:
      'A writing is not a negotiable instrument when payment depends on another agreement or contingency; negotiability demands an unconditional promise to pay.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['negotiable instrument', 'unconditional promise', 'contingency', 'ucc 3-104'],
  },
  {
    id: 'clh-ucc-3-104-fixed-amount',
    title: 'Negotiability requires a fixed amount of money',
    citation: 'Seed Common Law § UCC 3-104 / fixed amount',
    holding:
      'An instrument fails negotiability if the amount owed cannot be determined from the face of the paper as a fixed sum of money.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['fixed amount', 'money', 'negotiable instrument', 'ucc 3-104'],
  },
  {
    id: 'clh-ucc-3-104-order-bearer',
    title: 'Negotiability requires order or bearer language',
    citation: 'Seed Common Law § UCC 3-104 / order or bearer',
    holding:
      'Paper payable only to a specifically named person without order-or-bearer language does not satisfy the negotiability requirements of UCC 3-104.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['order', 'bearer', 'specific person', 'negotiable instrument', 'ucc 3-104'],
  },
  {
    id: 'clh-ucc-3-104-definite-time',
    title: 'Negotiability requires demand or definite time',
    citation: 'Seed Common Law § UCC 3-104 / demand or definite time',
    holding:
      'An instrument that leaves payment time indefinite is not negotiable because UCC 3-104 requires payment on demand or at a definite time.',
    statute: 'UCC 3-104',
    jurisdiction: 'Uniform Commercial Code',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['definite time', 'on demand', 'indefinite', 'negotiable instrument', 'ucc 3-104'],
  },
  {
    id: 'clh-common-law-gross-negligence',
    title: 'Gross-negligence indemnity is often void against public policy',
    citation: 'Seed Common Law § public policy / gross negligence indemnity',
    holding:
      'Courts routinely treat indemnity clauses covering a party’s own gross negligence as unenforceable or subject to strict construction against the drafter.',
    statute: 'Common Law Public Policy',
    jurisdiction: 'Multi-jurisdiction',
    court: 'Seed Corpus',
    year: 2026,
    source: 'seed-fallback',
    treatment: 'supports',
    keywords: ['gross negligence', 'indemnity', 'public policy', 'strict construction'],
  },
];
