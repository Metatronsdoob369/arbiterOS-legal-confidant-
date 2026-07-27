# Swarm Lane 1 — DTC / DTCC / Cede & Co. (Institutional Identity)

**Agent:** [DTC/DTCC identity](ec0de3f8-fcc8-4fa2-9802-806a8cf8b4c9)  
**Scope:** Public institutional facts only. Not legal advice. No redemption, sovereign-trust, or seal claims.

### Key entities

| Entity | Plain definition |
| --- | --- |
| **DTCC** | The Depository Trust & Clearing Corporation — a non-public, user-owned holding company (formed 1999) that owns market-infrastructure subsidiaries including DTC, NSCC, and FICC. |
| **DTC** | The Depository Trust Company — DTCC’s central securities depository subsidiary (est. 1973). A **limited-purpose trust company** under New York banking law, **Federal Reserve System member**, and **SEC-registered clearing agency**. Provides book-entry custody, settlement, and asset-servicing for eligible U.S. and foreign securities. |
| **Cede & Co.** | DTC’s **partnership nominee** (name from “certificate depository”). Appears as **registered holder of record** on issuer/transfer-agent books for securities held in DTC custody (“street name”). DTC’s records reflect **participants** (brokers, banks); DTC does not track beneficial owners directly. |

**Relationship:** DTCC (parent) → DTC (depository/CSD) → Cede & Co. (nominee of record for immobilized/book-entry positions).

### Official / primary URLs

- DTCC about: https://www.dtcc.com/about
- DTC subsidiary page: https://www.dtcc.com/about/businesses-and-subsidiaries/dtc.aspx
- DTCC legal / regulatory: https://www.dtcc.com/legal
- DTC Disclosure Framework (2026 Q1 PDF): https://www.dtcc.com/-/media/Files/Downloads/legal/policy-and-compliance/DTC-DISCLOSURE-FRAMEWORK-2026-Q1.pdf
- SEC registered clearing agencies: https://www.sec.gov/about/divisions-offices/division-trading-markets/clearing-agencies
- SEC Release 34-20221 (DTC full registration): https://www.sec.gov/files/rules/other/34-20221.pdf
- SEC Investor.gov — street name / Cede & Co.: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-97

### Suggested evidence refs

```json
{"type":"statute","ref":"Exchange Act §17A (15 U.S.C. §78q-1) — clearing-agency registration framework cited in DTC Disclosure Framework 2026 Q1","epistemic_ceiling":"settled"}
{"type":"opinion","ref":"SEC Release No. 34-20221 (1983-09-23) — order granting DTC full registration as a clearing agency","epistemic_ceiling":"settled"}
{"type":"procedure","ref":"DTCC DTC Disclosure Framework 2026 Q1 — legal form (NY limited-purpose trust co.), FRB/SEC/NYSDFS supervision, SIFMU designation","epistemic_ceiling":"institutional"}
{"type":"other","ref":"SEC Investor.gov Bulletin — Cede & Co. as DTC affiliate/nominee; street name vs direct registration","epistemic_ceiling":"institutional"}
{"type":"procedure","ref":"SEC Clearing Agencies page — DTC listed among active SEC-registered clearing agencies","epistemic_ceiling":"settled"}
{"type":"other","ref":"DTCC DTC subsidiary page — depository, book-entry custody, settlement role (self-description)","epistemic_ceiling":"institutional"}
```
