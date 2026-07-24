# Source survey — BuildaBOE.com (+ similars)

Date: 2026-07-23  
For: Private Confidant knowledge spine / scrape candidates  
Primary: [https://buildaboe.com/](https://buildaboe.com/)

## What it is

Commercial-instrument product + doctrine hub (Stratford Financial Solutions): generate Bills of Exchange / commercial paper ($1.99), memberships for forms/petitions, accounting class, Casemine-style review, and an **Eleventh Edition Publishing Co.** library of printed-matter pages.

Already echoed in-repo: `docs/guide-to-understanding-reality.ms` tracks the same remittance-coupon → BOE → UCC §3-310 / FASB ASC narrative as [Guide](https://buildaboe.com/guide/).

## Public vs gated (scrape reality)

| Surface | Access | Scrape value |
| --- | --- | --- |
| [Guide](https://buildaboe.com/guide/) | Public | High — long UCC/FASB/remittance essay (same DNA as local `.ms`) |
| [Tripartite Role](https://buildaboe.com/tripartite-role/) | Public | High — drawer/drawee/payee under UCC §3-103/3-104/3-408 |
| [Allege–Prove–Move](https://buildaboe.com/allege-prove-move/) | Public | Medium — pleading posture |
| [Petitions / declaratory](https://buildaboe.com/petitions-for-declaratory-relief/) | Public pages | Medium — forms labeled non-inclusive |
| [Blogs](https://buildaboe.com/blogs-and-articles/) | Thin (few posts) | Low |
| [Online library / Pro](https://buildaboe.com/) | Membership | Unknown depth — do not scrape behind login without license |
| Instrument generator | Paid | Product, not literature |
| [Accounting class](https://buildaboe.com/product/accounting-class/) | Paid Zoom | Pedagogy; materials not included with purchase |
| Treatise ebook/paperback (double-entry + BOE) | Paid product | Aligns with **Pacioli surgical priority** — buy/own, then book-to-skill |

### Eleventh Edition library (high interest)

Public page index under publishing co. Notable printed-matter titles (WP pages):

- L.W. Feezer, *Acceptance of Bills of Exchange by Conduct*, 13 Minn. L. Rev. 129 (1928) — matches earlier Drive PDF title  
- J.P. Ludington, ALR annotation on UCC Art. 3 (1969)  
- *Three Theories of Banking* — matches earlier Drive PDF title  
- Credit creation / banks ex nihilo / Fed Act antecedent debt  
- Names & changes of name treatise  
- Common law vs equity; gold-fringe debunk  
- Citizenship evolution; plaint→complaint history  

Hub: [Eleventh Edition Publishing Co.](https://buildaboe.com/eleventh-edition-publishing-co/) · [Printed matter](https://buildaboe.com/eleventh-edition-publishing-co/library/printed-matter/)

WP JSON works for discovery: `https://buildaboe.com/wp-json/wp/v2/pages`

## Epistemic banding (Pcon law)

| Band | From BuildaBOE stack |
| --- | --- |
| **settled** | Verbatim UCC Art. 3/4 cites, state codifications, when verified against LII/state code |
| **institutional** | FASB ASC cites, remittance statutes (15 U.S.C. §1693o-1), when checked against primary sources |
| **contested** | Vendor-as-drawee+payee coupon theory; automatic discharge narratives; “invisibility” wealth framing |
| **cold-map risk** | Treating site essays as settled law; scraping membership content; advocacy myth-as-code |

Do **not** ingest BuildaBOE prose as settled. Use it as a **cite map** → verify on primary → lexicon/spine with bands.

## Similar / better primary corpora (prefer these for warm spine)

1. **Cornell LII — UCC Article 3** — [§3-104](https://www.law.cornell.edu/ucc/3/3-104), [§3-501 Presentment](https://www.law.cornell.edu/ucc/3/3-501), Wex [negotiable instrument](https://www.law.cornell.edu/wex/negotiable_instrument)  
2. **State UCC enactments** (e.g. Tex. Bus. & Com. Code) — same sections BuildaBOE dropdown lists  
3. **TFX Gold Book** — already in book-pipeline (reclamations)  
4. **FASB ASC** / GAAP derecognition texts — for accounting half (license-aware)  
5. **Historic law reviews / ALR** — Feezer, Ludington: prefer original journal/ALR PDFs you own (Drive) over site HTML  
6. **Restatement (2d) Contracts** — accord/tender sections cited in Guide  
7. **UNCITRAL** bills/notes convention — comparative only; US not party  

## Similar commercial hubs (adjacent, handle as contested)

- Stratford Tax & Wealth Group (affiliate named on site)  
- Other “commercial instrument / administrative remedy” shops — same scrape rules: cite map ≠ settled pack  
- Casemine (authority-check vendor) — tool, not corpus  

Avoid as warm spine: fringe “sovereign” dumps that collapse contested→settled (cold-map citizens).

## Recommended ingest path (no muddy scrape)

1. **Already local:** `guide-to-understanding-reality.ms` ↔ Guide page — diff once; treat as contested doctrine essay, not auto-lexicon.  
2. **Own the Drive PDFs** (Feezer; Three Theories of Banking) → `~/Downloads/corpus/p1-doctrine/` → book-to-skill / artifact when ready.  
3. **Public BuildaBOE pages** (Guide, Tripartite, Allege–Prove–Move): optional HTML→md mirror under `pcon/knowledge/spine/sources/buildaboe/` with `trust: external_ref`, `epistemic_ceiling: contested`.  
4. **Primary UCC** from LII into spine as `settled` pointers (not full scrape of BuildaBOE).  
5. **Pacioli + Treatise on double-entry & BOE** (paid/owned) — surgical skill for debtor/creditor orientation.  
6. **Never** automate login scrape of Pro library / membership PDFs.

## Bottom line

BuildaBOE is a **doctrine + product funnel** with a surprisingly good **bibliography portal** (Eleventh Edition). For Pcon efficacy: mine it for *what to read*, verify on LII/TFX/FASB/owned PDFs, band contested claims, cold-map myth collapses. That beats dumping the whole site into a skill.
