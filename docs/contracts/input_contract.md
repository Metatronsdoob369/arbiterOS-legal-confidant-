# Input Contract Specification

## Document Metadata

- **Contract Name:** `InputContractV1`
- **Scope:** Legal Auditor Pipeline request intake
- **Status:** Draft (Normative for implementation once adopted)
- **Canonical Runtime Validator:** Zod

---

## Purpose

The input contract defines the only acceptable shape for requests entering the Legal Auditor pipeline.

It converts ambiguous user intent into a deterministic, typed structure that downstream policy and tool layers can trust. Any payload that fails validation **must be rejected** before orchestration begins.

---

## Normative Zod Schema (TypeScript)

```ts
import { z } from "zod";

export const InputContractV1 = z.object({
  contractVersion: z.literal("1.0"),

  taxYear: z
    .string()
    .regex(/^\d{4}$/, "taxYear must be a 4-digit year")
    .refine((y) => {
      const n = Number(y);
      return n >= 1900 && n <= 2100;
    }, "taxYear must be between 1900 and 2100"),

  jurisdiction: z
    .string()
    .trim()
    .min(2, "jurisdiction is required")
    .max(64, "jurisdiction too long"),

  entityType: z.enum([
    "sole_proprietorship",
    "single_member_llc",
    "multi_member_llc",
    "partnership",
    "s_corp",
    "c_corp",
    "nonprofit",
    "other"
  ]),

  expenseAmount: z
    .number({ invalid_type_error: "expenseAmount must be a number" })
    .finite("expenseAmount must be finite")
    .positive("expenseAmount must be greater than 0")
    .max(1_000_000_000, "expenseAmount exceeds allowed maximum"),

  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "currency must be ISO-4217 uppercase (e.g., USD)"),

  expenseCategory: z
    .string()
    .trim()
    .min(2, "expenseCategory is required")
    .max(128, "expenseCategory too long"),

  businessPurpose: z
    .string()
    .trim()
    .min(10, "businessPurpose must be at least 10 characters")
    .max(2000, "businessPurpose too long"),

  incurredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "incurredDate must be YYYY-MM-DD")
    .refine((d) => !Number.isNaN(Date.parse(d)), "incurredDate must be a valid date"),

  paymentMethod: z.enum([
    "cash",
    "credit_card",
    "debit_card",
    "bank_transfer",
    "check",
    "other"
  ]),

  vendorName: z
    .string()
    .trim()
    .min(1, "vendorName is required")
    .max(256, "vendorName too long"),

  naicsCode: z
    .string()
    .regex(/^\d{2,6}$/, "naicsCode must be 2 to 6 digits")
    .optional(),

  memo: z
    .string()
    .trim()
    .max(2000, "memo too long")
    .optional(),

  sourceAttribution: z.object({
    sourceType: z.enum(["user_input", "import", "api"]),
    sourceId: z.string().trim().min(1).max(256),
    capturedAt: z.string().datetime({ offset: true })
  }),

  attachments: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(256),
        kind: z.enum(["receipt", "invoice", "statement", "other"]),
        sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, "sha256 must be 64 hex chars"),
        uri: z.string().url("attachment uri must be a valid URL")
      })
    )
    .max(25, "too many attachments")
    .default([])
}).strict();

export type InputContractV1 = z.infer<typeof InputContractV1>;
```

---

## Field Semantics and Constraints

| Field | Type | Required | Notes |
|---|---|---|---|
| `contractVersion` | literal `"1.0"` | Yes | Hard pin for deterministic parsing |
| `taxYear` | `string` (YYYY) | Yes | 1900–2100 inclusive |
| `jurisdiction` | `string` | Yes | Example: `US-FEDERAL`, `US-CA` |
| `entityType` | enum | Yes | Business entity classification |
| `expenseAmount` | `number` | Yes | Positive finite value only |
| `currency` | `string` | Yes | ISO-4217 uppercase code |
| `expenseCategory` | `string` | Yes | Human-readable normalized category |
| `businessPurpose` | `string` | Yes | Must contain substantive justification |
| `incurredDate` | `YYYY-MM-DD` | Yes | Actual date expense was incurred |
| `paymentMethod` | enum | Yes | Controlled vocabulary |
| `vendorName` | `string` | Yes | Counterparty/payee |
| `naicsCode` | numeric string 2–6 | No | Optional business classification |
| `memo` | `string` | No | Optional internal note |
| `sourceAttribution` | object | Yes | Provenance metadata |
| `attachments` | array | No | Evidence pointers with content hash |

---

## Valid Example Payloads

### Example A: Vehicle expense candidate

```json
{
  "contractVersion": "1.0",
  "taxYear": "2026",
  "jurisdiction": "US-FEDERAL",
  "entityType": "single_member_llc",
  "expenseAmount": 48250,
  "currency": "USD",
  "expenseCategory": "vehicle_purchase",
  "businessPurpose": "Purchase of work truck used primarily for on-site client equipment transport and service operations.",
  "incurredDate": "2026-03-14",
  "paymentMethod": "bank_transfer",
  "vendorName": "Metro Fleet Trucks LLC",
  "naicsCode": "811310",
  "memo": "Asset intended for business use; mixed-use assessment pending.",
  "sourceAttribution": {
    "sourceType": "user_input",
    "sourceId": "session_01JV9Y9QJ7N9Y8Q8YY3W",
    "capturedAt": "2026-05-08T21:00:00+00:00"
  },
  "attachments": [
    {
      "id": "att_receipt_001",
      "kind": "invoice",
      "sha256": "8f0f0f68ddf4f2b6ec90f5f05245f6b532d18ec7af87f5f7935df4d35a6d0c7e",
      "uri": "https://example.com/docs/invoice-001.pdf"
    }
  ]
}
```

### Example B: Software subscription expense

```json
{
  "contractVersion": "1.0",
  "taxYear": "2025",
  "jurisdiction": "US-FEDERAL",
  "entityType": "s_corp",
  "expenseAmount": 1299,
  "currency": "USD",
  "expenseCategory": "software_subscription",
  "businessPurpose": "Annual subscription for project management and compliance documentation workflows used by the operations team.",
  "incurredDate": "2025-11-02",
  "paymentMethod": "credit_card",
  "vendorName": "TaskForge Inc",
  "sourceAttribution": {
    "sourceType": "api",
    "sourceId": "erp_sync_run_78431",
    "capturedAt": "2025-11-03T02:45:10+00:00"
  },
  "attachments": []
}
```

---

## Invalid Example Payloads

### Invalid A: Missing required fields + malformed values

```json
{
  "contractVersion": "1.0",
  "taxYear": "26",
  "jurisdiction": "",
  "entityType": "llc",
  "expenseAmount": -10,
  "currency": "usd",
  "expenseCategory": "",
  "businessPurpose": "for work",
  "incurredDate": "2026/03/14",
  "paymentMethod": "wire",
  "vendorName": "",
  "sourceAttribution": {
    "sourceType": "manual",
    "sourceId": "",
    "capturedAt": "not-a-date"
  }
}
```

Expected validation failures include:

- `taxYear` not 4-digit year
- `jurisdiction` empty
- `entityType` not in enum
- `expenseAmount` not positive
- `currency` not ISO uppercase 3-char
- `expenseCategory` empty
- `businessPurpose` too short
- `incurredDate` wrong format
- `paymentMethod` not in enum
- `vendorName` empty
- `sourceAttribution.sourceType` invalid
- `sourceAttribution.sourceId` empty
- `sourceAttribution.capturedAt` invalid datetime

### Invalid B: Unknown keys (strict mode)

```json
{
  "contractVersion": "1.0",
  "taxYear": "2026",
  "jurisdiction": "US-FEDERAL",
  "entityType": "c_corp",
  "expenseAmount": 1500,
  "currency": "USD",
  "expenseCategory": "office_supplies",
  "businessPurpose": "Office supplies for employee workstations and client presentation prep.",
  "incurredDate": "2026-01-10",
  "paymentMethod": "debit_card",
  "vendorName": "Office World",
  "sourceAttribution": {
    "sourceType": "import",
    "sourceId": "batch_445",
    "capturedAt": "2026-01-11T10:10:10+00:00"
  },
  "attachments": [],
  "unexpectedField": "should fail"
}
```

Expected validation failure:

- Unknown key `unexpectedField` rejected due to `.strict()`

---

## Validation Behavior Requirements

1. **Fail fast**: Reject payload on first validation pass before any policy/tool execution.
2. **No coercion by default**: Inputs must already be in canonical type/format.
3. **Deterministic errors**: Return stable machine-readable error codes and field paths.
4. **No partial acceptance**: Entire payload is invalid if any required field fails.

---

## Suggested Error Envelope

```json
{
  "error": "INPUT_CONTRACT_VALIDATION_FAILED",
  "contract": "InputContractV1",
  "contractVersion": "1.0",
  "issues": [
    {
      "path": "taxYear",
      "code": "invalid_string",
      "message": "taxYear must be a 4-digit year"
    }
  ]
}
```

---

## Versioning and Governance

- Use **semantic contract versions** (e.g., `1.0`, `1.1`, `2.0`).
- **Minor version** for additive backward-compatible fields.
- **Major version** for breaking changes (required field changes, enum contractions, type changes).
- Maintain migration notes and dual-parse windows when rolling versions.
- Pin orchestration logic to an explicit contract version.

---

## Conformance Checklist

- [ ] Validator is implemented exactly as specified.
- [ ] `.strict()` mode enabled.
- [ ] Error envelope format implemented.
- [ ] Unit tests cover valid/invalid examples.
- [ ] Version pinning enforced in orchestrator.
- [ ] Attachments hash format validated as SHA-256 hex.
