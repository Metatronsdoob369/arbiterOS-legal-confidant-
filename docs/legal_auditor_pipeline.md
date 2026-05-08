# Legal Auditor Pipeline

## Overview

The **Legal Auditor** is a specialized Zero-Trust AI policy engine for producing verifiable, deterministic legal answers for complex tax-law questions (e.g., deductibility under **26 U.S.C. § 162(a)**).

Its primary goal is to eliminate the "chaos tax" created by probabilistic LLM behavior in legal contexts by making incorrect or unverifiable outputs architecturally unacceptable.

This design treats the orchestration AI as a constrained coordinator, not a legal reasoner.

---

## Problem Statement

Traditional generative AI systems are probabilistic and can produce uncertain or hallucinated legal conclusions. In high-liability domains like tax compliance, this creates material operational and legal risk.

The Legal Auditor addresses this by:

- Replacing freeform generation with strict contracts
- Delegating legal checks to deterministic tools
- Enforcing legal sequencing through policy rules
- Logging every decision/action into an auditable trail

---

## Design Principles

1. **Zero Trust**: No component is trusted without verification.
2. **Faithless Execution**: System correctness does not depend on model "judgment".
3. **Contract-First Data Flow**: All data entering/leaving steps must satisfy explicit schemas.
4. **Deterministic Tooling**: Legal predicates are evaluated by deterministic services.
5. **Mandatory Auditability**: Every step generates machine-verifiable receipts.

---

## Pipeline Architecture

The Legal Auditor uses a three-part pipeline guarded by strict control mechanisms ("chastity belts"):

1. **Input Contracting (Vibe-to-Contract Compiler)**
2. **Deterministic Legal Evaluation (Tool Layer + Verifiable Law DB Client)**
3. **Policy Engine Routing + Audit Enforcement**

---

## 1) Input Contracting: Vibe-to-Contract Compiler

### Purpose

Convert ambiguous natural-language user requests into strict, typed, verifiable objects before any policy logic executes.

### Mechanism

- User input ("vibe") is never trusted directly.
- Compiler maps text into structured fields (e.g., expense category, amount, business context, NAICS, period).
- Validation is enforced with schema contracts (e.g., Zod).

### Control Outcome

- If payload fails schema validation, execution halts immediately.
- The orchestrator only receives validated contract objects.

---

## 2) Deterministic Legal Evaluation Layer

### Purpose

Evaluate legal predicates via deterministic services instead of LLM interpretation.

### Components

- **Ordinary Check Tool**: Queries a **Verifiable Law Database Client** for true/false outcomes against compiled legal sources.
- **Necessary Check Tool**: Applies deterministic business logic (e.g., codified threshold/criteria checks).
- Additional tools may be added if each remains deterministic and contract-bound.

### Control Outcome

- No freeform legal reasoning inside the orchestrator.
- No retrieval-augmented guessing path.
- Tool outputs must conform to output contracts.

---

## 3) Policy Engine + Sequence Enforcement

### Purpose

Ensure legal/process prerequisites are followed in strict order.

### Mechanism

- Router uses explicit **if-this-then-that** rules.
- Tool eligibility is dynamically constrained by prior validated outcomes.

### Example

If `isOrdinary === false`, then `isNecessary` is not callable and the process terminates with a contract-valid result.

### Control Outcome

The model cannot bypass legal sequence requirements or call unauthorized next steps.

---

## Chastity Belts (Hard Safety Controls)

These controls make invalid behavior non-executable:

1. **Input Contract Belt**
   - Rejects malformed/ambiguous input objects.
2. **Tool Contract Belt**
   - Rejects non-conforming tool request/response payloads.
3. **Policy Routing Belt**
   - Prevents out-of-sequence or unauthorized tool invocation.
4. **Output Contract Belt**
   - Requires final result JSON shape; disallows chatty opinions.
5. **Audit Belt**
   - Requires append-only validation receipts for all steps.

---

## Data Contracts

All contracts should be versioned and backward-compatible by policy.

### Input Contract (example shape)

- `taxYear: string`
- `entityType: string`
- `expenseAmount: number`
- `expenseCategory: string`
- `businessPurpose: string`
- `naicsCode?: string`
- `jurisdiction: string`

### Tool Result Contract (example)

- `toolName: string`
- `predicate: string`
- `result: boolean`
- `evidenceRefs: string[]`
- `timestamp: string`
- `contractVersion: string`

### Final Audit Result Contract (example)

- `decision: "deductible" | "not_deductible" | "insufficient_data"`
- `reasonCodes: string[]`
- `validationSteps: ValidationStepReceipt[]`
- `contractVersion: string`

---

## Verifiable Law Database Client

### Role

Provides deterministic legal lookup/evaluation support from compiled, auditable legal sources.

### Requirements

- Source provenance and version pinning
- Deterministic query behavior
- Reproducible outputs for identical inputs
- Traceable citations/evidence references

This client is the legal-grounding backbone and must be independently testable.

---

## Mandatory Audit Trail

A `validationSteps` array is required and append-only for each execution.

Each receipt should include:

- Step ID and type
- Input hash
- Contract version
- Tool invoked (if any)
- Deterministic result
- Evidence references
- Timestamp

No final decision is considered valid without a complete trail.

---

## Failure Modes and Handling

1. **Schema validation failure**
   - Stop execution; return contract-safe error.
2. **Tool contract mismatch**
   - Reject response; mark step invalid; stop.
3. **Policy sequence violation attempt**
   - Deny invocation; log violation.
4. **Missing audit receipt**
   - Invalidate run.
5. **Law DB unavailable/non-deterministic behavior**
   - Fail closed; no legal conclusion emitted.

---

## Compliance Posture

This architecture supports "zero-shot compliance" in the sense that legal reliability is produced by system constraints and deterministic components, not by model pretraining confidence.

The burden of correctness shifts to:

- Tool logic validity
- Law database soundness
- Contract quality and governance
- Policy rule completeness

---

## Open Questions / Risks

1. **Legal Nuance vs. Hard Thresholds**
   - Can deterministic heuristics (e.g., ratio cutoffs) capture "necessary" in a legally defensible way across contexts?
2. **Source Compilation Governance**
   - How are legal updates ingested, validated, and versioned?
3. **Jurisdictional Variation**
   - How does the system handle federal vs. state-level conflicts?
4. **Appeals/Override Process**
   - Is there a supervised human review path for edge cases?

---

## Recommended Next Artifacts

1. `docs/contracts/input_contract.md`
2. `docs/contracts/tool_result_contract.md`
3. `docs/contracts/final_audit_result_contract.md`
4. `docs/policy-engine-routing-rules.md`
5. `docs/verifiable-law-db-client-spec.md`
6. `docs/audit-trail-receipt-schema.md`

These documents should define normative schemas, examples, and conformance tests.
