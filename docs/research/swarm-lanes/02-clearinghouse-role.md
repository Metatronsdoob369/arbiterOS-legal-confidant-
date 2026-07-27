# Swarm Lane 2 — Clearing vs Depository vs Holding Company

**Agent:** [Clearinghouse role](6192d2cb-c8bf-45ce-acc8-38490b8df968)

**DTCC** is a **non-public, user-owned holding company**. It owns subsidiaries; it does **not** itself operate as the market’s depository or CCP.

**DTC** is a **wholly owned DTCC subsidiary** and the U.S. **central securities depository (CSD)**: immobilize/dematerialize securities, participant accounts, book-entry transfers, custody/asset servicing, settlement. Legally: **limited-purpose trust company** under NY banking law, Fed member, SEC-registered clearing agency. “DTC trust” in institutional language = this **trust-company charter**, not a generic sovereign “trust account.”

**NSCC** — equities/mixed **CCP** (netting, novation, T+1 clearing).  
**FICC** — fixed-income **CCP** (GSD Treasuries/repo; MBSD MBS).

**Flow:** trades clear/net at **NSCC** or **FICC** → settlement at **DTC**.

### Misuse correction

| Wrong | Right |
| --- | --- |
| “DTCC clearinghouse holds the DTC trust” | **DTCC** = parent; **DTC** / **NSCC** / **FICC** = separate operating entities |
| “DTC is the clearinghouse” | **DTC = depository/settlement CSD**; equity CCP ≈ **NSCC**; FI CCP ≈ **FICC** |
| “Clearinghouse = holding company” | Holding company **owns** clearing agencies; does not substitute for them |

### Evidence refs

```json
{"type":"procedure","ref":"https://www.dtcc.com/-/media/Files/Downloads/legal/policy-and-compliance/NSCC-Disclosure-Framework-Q2-2024.pdf","epistemic_ceiling":"institutional"}
{"type":"procedure","ref":"https://www.dtcc.com/-/media/Files/Downloads/legal/policy-and-compliance/DTC-DISCLOSURE-FRAMEWORK-2026-Q1.pdf","epistemic_ceiling":"institutional"}
{"type":"other","ref":"https://www.dtcc.com/about/businesses-and-subsidiaries/dtc.aspx","epistemic_ceiling":"institutional"}
{"type":"other","ref":"https://www.dtcc.com/about/businesses-and-subsidiaries/nscc","epistemic_ceiling":"institutional"}
{"type":"other","ref":"https://www.dtcc.com/about/businesses-and-subsidiaries/ficc","epistemic_ceiling":"institutional"}
{"type":"procedure","ref":"https://www.dtcc.com/ustclearing/-/media/Files/Downloads/Microsites/Treasury-Clearing/FICC-Basics-FAQ.pdf","epistemic_ceiling":"institutional"}
```
