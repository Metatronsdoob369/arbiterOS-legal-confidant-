import type { ValidationStep } from '../../../../schemas/legalSchemas';
import type { FormGenerationInput } from '../../../../schemas/legalSchemas';

export type FormTemplateId = FormGenerationInput['form_type'];

export type FormTemplate<T extends FormGenerationInput = FormGenerationInput> = {
  id: T['form_type'];
  validate: (input: T) => Promise<ValidationStep[]>;
  renderMarkdown: (input: T) => string;
};

export type GenerateFormResult = {
  markdown: string;
  validation_steps: ValidationStep[];
  passed: boolean;
};
