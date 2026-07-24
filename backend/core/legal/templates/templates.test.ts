import { describe, expect, it, vi } from 'vitest';
import { FormGenerationSchema } from '../../../../schemas/legalSchemas';
import { buildDocxBuffer } from '../legalExport';
import { runFormTemplate } from './index';

vi.mock('../formChecks', () => ({
  verifyNegotiability: vi.fn(async () => ({
    rule_id: 'UCC_3_104',
    passed: true,
    details: 'PASSED: Instrument meets all UCC 3-104 requirements for negotiability.',
    evidence_source: 'UCC 3-104',
    timestamp: new Date().toISOString(),
  })),
  consultStatuteCitation: vi.fn(async (query: string) => query),
}));

describe('form template registry', () => {
  it('rejects incomplete promissory notes at the Zod boundary', () => {
    const parsed = FormGenerationSchema.safeParse({
      form_type: 'promissory_note_ucc',
      amount: 1000,
      lender: 'Acme Capital',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects security agreements with insufficient collateral description', () => {
    const parsed = FormGenerationSchema.safeParse({
      form_type: 'security_agreement_ucc',
      collateral: 'abc',
    });

    expect(parsed.success).toBe(false);
  });

  it('renders a validated promissory note', async () => {
    const input = FormGenerationSchema.parse({
      form_type: 'promissory_note_ucc',
      amount: 25000,
      lender: 'Acme Capital',
      borrower: 'Jordan Doe',
      state: 'Alabama',
    });

    const result = await runFormTemplate(input);
    expect(result.passed).toBe(true);
    expect(result.markdown).toContain('PROMISSORY NOTE');
    expect(result.markdown).toContain('Acme Capital');
    expect(result.markdown).toContain('Jordan Doe');
    expect(result.validation_steps.every((step) => step.passed)).toBe(true);
  });

  it('renders a security agreement with collateral', async () => {
    const result = await runFormTemplate({
      form_type: 'security_agreement_ucc',
      collateral: '2020 Ford F-150 VIN 1FTFW1E50LFA00000',
      debtor: 'Jordan Doe',
      secured_party: 'Acme Capital',
    });

    expect(result.passed).toBe(true);
    expect(result.markdown).toContain('SECURITY AGREEMENT');
  });

  it('renders contractor and bill of sale templates', async () => {
    const contractor = await runFormTemplate({
      form_type: 'contractor_agreement',
      client: 'Client Co',
      contractor: 'Dev LLC',
      services: 'Software development',
    });
    expect(contractor.passed).toBe(true);
    expect(contractor.markdown).toContain('INDEPENDENT CONTRACTOR');

    const bill = await runFormTemplate({
      form_type: 'bill_of_sale_ucc',
      seller: 'Seller',
      buyer: 'Buyer',
      goods_description: 'One lathe, serial 123',
      amount: 500,
    });
    expect(bill.passed).toBe(true);
    expect(bill.markdown).toContain('BILL OF SALE');
  });

  it('renders NDA, service, consulting, and IP assignment templates', async () => {
    const nda = await runFormTemplate({
      form_type: 'nda',
      disclosing_party: 'Acme Corp',
      receiving_party: 'Beta LLC',
      purpose: 'evaluating a potential joint venture',
      term_years: 3,
    });
    expect(nda.passed).toBe(true);
    expect(nda.validation_steps[0]?.rule_id).toBe('R5_CONFIDENTIALITY');
    expect(nda.markdown).toContain('NON-DISCLOSURE');

    const service = await runFormTemplate({
      form_type: 'service_agreement',
      client: 'Client Co',
      provider: 'Provider Inc',
      services: 'Managed infrastructure support',
      fee: 12000,
    });
    expect(service.passed).toBe(true);
    expect(service.validation_steps[0]?.rule_id).toBe('R5_SERVICES_SCOPE');
    expect(service.markdown).toContain('MASTER SERVICE AGREEMENT');

    const consulting = await runFormTemplate({
      form_type: 'consulting_agreement',
      client: 'Client Co',
      consultant: 'Advisor LLC',
      scope: 'Go-to-market strategy advisory',
      retainer: 5000,
    });
    expect(consulting.passed).toBe(true);
    expect(consulting.validation_steps[0]?.rule_id).toBe('R5_CONSULTING_SCOPE');
    expect(consulting.markdown).toContain('CONSULTING AGREEMENT');

    const ip = await runFormTemplate({
      form_type: 'ip_assignment',
      assignor: 'Developer',
      assignee: 'Startup Inc',
      work_description: 'Source code and documentation for Project Helios',
      consideration: '$1.00 and other good and valuable consideration',
    });
    expect(ip.passed).toBe(true);
    expect(ip.validation_steps[0]?.rule_id).toBe('R5_IP_ASSIGNMENT');
    expect(ip.markdown).toContain('INTELLECTUAL PROPERTY ASSIGNMENT');
  });

  it('blocks NDA when parties are not distinct', async () => {
    const result = await runFormTemplate({
      form_type: 'nda',
      disclosing_party: 'Same Party',
      receiving_party: 'Same Party',
      purpose: 'due diligence',
      term_years: 2,
    });
    expect(result.passed).toBe(false);
    expect(result.markdown).toContain('GENERATION BLOCKED');
  });
});

describe('legalExport', () => {
  it('builds a non-empty docx buffer with dossier markers', async () => {
    const formResult = await runFormTemplate({
      form_type: 'promissory_note_ucc',
      amount: 1000,
      lender: 'Lender',
      borrower: 'Borrower',
    });

    const buffer = await buildDocxBuffer({
      id: 'draft-test-1',
      form: {
        form_type: 'promissory_note_ucc',
        amount: 1000,
        lender: 'Lender',
        borrower: 'Borrower',
      },
      markdown: formResult.markdown,
      validation_steps: formResult.validation_steps,
      passed: true,
      provenance: { citations: [], holdings: [], source_refs: [] },
      created_at: new Date().toISOString(),
    });

    expect(buffer.byteLength).toBeGreaterThan(1000);
    // docx files are zip archives
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });
});
