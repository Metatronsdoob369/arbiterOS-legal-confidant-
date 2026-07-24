import type { FormGenerationInput } from '../../../../schemas/legalSchemas';
import { billOfSaleTemplate } from './bill_of_sale_ucc';
import { consultingAgreementTemplate } from './consulting_agreement';
import { contractorAgreementTemplate } from './contractor_agreement';
import { ipAssignmentTemplate } from './ip_assignment';
import { ndaTemplate } from './nda';
import { promissoryNoteTemplate } from './promissory_note_ucc';
import { securityAgreementTemplate } from './security_agreement_ucc';
import { serviceAgreementTemplate } from './service_agreement';
import type { FormTemplate, FormTemplateId, GenerateFormResult } from './types';

const registry = {
  promissory_note_ucc: promissoryNoteTemplate,
  security_agreement_ucc: securityAgreementTemplate,
  bill_of_sale_ucc: billOfSaleTemplate,
  contractor_agreement: contractorAgreementTemplate,
  nda: ndaTemplate,
  service_agreement: serviceAgreementTemplate,
  consulting_agreement: consultingAgreementTemplate,
  ip_assignment: ipAssignmentTemplate,
} as const satisfies Record<FormTemplateId, FormTemplate>;

export function getFormTemplate(formType: FormTemplateId): FormTemplate {
  return registry[formType] as FormTemplate;
}

export async function runFormTemplate(input: FormGenerationInput): Promise<GenerateFormResult> {
  const template = getFormTemplate(input.form_type);
  const validation_steps = await template.validate(input as never);
  const passed = validation_steps.every((step) => step.passed);

  if (!passed) {
    const reason = validation_steps.find((step) => !step.passed)?.details ?? 'Validation failed';
    return {
      markdown: `> **GENERATION BLOCKED**: Protocol Violation.\n> Reason: ${reason}`,
      validation_steps,
      passed: false,
    };
  }

  return {
    markdown: template.renderMarkdown(input as never),
    validation_steps,
    passed: true,
  };
}

export { registry as formTemplateRegistry };
export type { FormTemplate, FormTemplateId, GenerateFormResult } from './types';
