# Research Swarm Synthesis — DTC Trust + Clearinghouse

Date: 2026-07-24  
Ledger case: Restructure trusts and DTC clearinghouse study  
Study hypothesis: DTC Trust and clearinghouse structure  
Lane: **study** — no seal; attach institutional evidence only  

## Agents

| Lane | Agent | File |
| --- | --- | --- |
| 1 Identity | [DTC/DTCC identity](ec0de3f8-fcc8-4fa2-9802-806a8cf8b4c9) | [01-dtc-dtcc-identity.md](./swarm-lanes/01-dtc-dtcc-identity.md) |
| 2 Clearing vs depository | [Clearinghouse role](6192d2cb-c8bf-45ce-acc8-38490b8df968) | [02-clearinghouse-role.md](./swarm-lanes/02-clearinghouse-role.md) |
| 3 Participant access | [Participant access](c0d80891-b00e-4505-bbb8-beb2e9d3f9d2) | [03-participant-access.md](./swarm-lanes/03-participant-access.md) |
| 4 Regulatory pointers | [Regulatory pointers](b58a4ad2-b766-43cc-a00d-e8994bb05da3) | [04-regulatory-pointers.md](./swarm-lanes/04-regulatory-pointers.md) |
| 5 Myths / cold map | [Myths vs cold map](8907cc52-4c0f-4c01-a2e1-6f7d54ee03dd) | [05-myths-cold-map.md](./swarm-lanes/05-myths-cold-map.md) |

## Institutional map (consensus)

```text
DTCC (user-owned holding company)
 ├── DTC  — central securities depository; NY limited-purpose trust co.;
 │          Fed member; SEC-registered clearing agency; Cede & Co. nominee
 ├── NSCC — equities / mixed CCP (clearing, netting)
 └── FICC — fixed-income CCP (GSD / MBSD)
```

**Flow:** clear at NSCC/FICC → settle book-entry at DTC.  
**Access:** participants are organizations (B/D, banks, etc.); retail individuals do not hold DTC membership accounts — DRS or street name via broker.  
**“DTC trust”** in institutional speech = DTC’s **trust-company charter**, not a per-citizen birth-certificate trust ledger.

## Corrected jotting cut (study, not seal)

| Jotting language | Institutional read (study) |
| --- | --- |
| “Clearinghouse as holding company for DTC trust” | **DTCC** is the holding company; clearinghouses are **NSCC/FICC**; **DTC** is the depository/trust company |
| Start research at DTC + clearinghouse | Affirmed — correct cut line; upper map stays `working_premise` |
| Locate holders / pull distributions | **Not supported** by public DTC structure for natural persons; keep as unsealed goal language until situation-bound evidence exists |

## Priority attach candidates (Counselor / `ledger_attach_evidence`)

1. DTC Disclosure Framework 2026 Q1 — `procedure` / institutional  
2. DTC Rules & Procedures PDF — `procedure` / institutional  
3. 15 U.S.C. § 78q-1 (§ 17A) — `statute` / settled  
4. 15 U.S.C. § 78c(a)(23)(A) — `statute` / settled  
5. SEC Clearing Agencies page (DTC listed) — `procedure` / institutional  
6. Investor.gov street name / Cede & Co. — `other` / institutional  
7. TreasuryDirect birth-certificate-bonds fraud page — `other` / institutional (cold-map fuel)

## Cold-map seeds to promote next

Highest-signal for Pcon burns (from lane 5):

- `birth-cert-negotiable-bond`  
- `dtc-individual-citizen-account`  
- `dtc-trust-distribution-to-living-man`  
- `all-caps-strawman-dual-persona`  

## Non-goals respected

No seals. No Growth mint. No live-world mutation. Code ≠ situation-truth.

## Next intentional moves

1. Attach priority refs to study hypothesis via Counselor / API.  
2. Seed 2–4 cold-map JSON entries from lane 5 slugs.  
3. Keep business/trust restructure path separate from DTC myth stack until procedural potential earns gates.
