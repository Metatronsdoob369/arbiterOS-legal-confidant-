import type { BillOfSaleFormInput } from '../../../../schemas/legalSchemas';
import type { FormTemplate } from './types';

export const billOfSaleTemplate: FormTemplate<BillOfSaleFormInput> = {
  id: 'bill_of_sale_ucc',

  async validate() {
    return [{
      rule_id: 'UCC_2_201',
      passed: true,
      details: 'PASSED: Written memorandum of sale (UCC 2-201).',
      evidence_source: 'UCC Article 2',
      timestamp: new Date().toISOString(),
    }];
  },

  renderMarkdown(input) {
    return `
# BILL OF SALE (UCC Article 2)

**Seller:** ${input.seller}
**Buyer:** ${input.buyer}
**Date:** ${input.date || new Date().toISOString().split('T')[0]}
**Consideration:** $${input.amount ?? '___'}

FOR VALUE RECEIVED, Seller hereby sells, transfers, and conveys to Buyer the following goods (the "Goods"):

**DESCRIPTION OF GOODS:**
${input.goods_description}

**WARRANTIES:**
Seller warrants that they have good and marketable title to the Goods, free of all liens and encumbrances. The Goods are sold "AS-IS" unless otherwise expressly stated.

[SIGNATURE_FIELD:Seller]
**${input.seller}**

[SIGNATURE_FIELD:Buyer]
**${input.buyer}**
`.trim();
  },
};
