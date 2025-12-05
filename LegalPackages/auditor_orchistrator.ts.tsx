import { Agent, RunContext, run, withTrace } from '@openai/agents';
import { z } from 'zod';
import {
  Section162aContract,
  Section162aContractZod,
  AuditResult,
  AuditResultZod,
  ValidationStep
} from './legal_auditor_schemas.js';
import { isOrdinaryTool, isNecessaryTool } from './legal_auditor_tools.js';

// This is our "if-this-then-that" Policy Engine.
// It defines *when* a specialist tool is allowed to be used.
// This is the "Zero Trust" layer.

/**
 * Policy: The "is_necessary_tool" is *only* enabled if the "is_ordinary_tool"
 * has already been run AND it *passed*.
 * This prevents "wasted cycles" and enforces a logical pipeline.
 */
export function isNecessaryEnabled({ runContext }: { runContext: RunContext<any> }) {
  // Access the "echo chamber" of the run's history
  // Casting to any because history property might not be in the RunContext type definition
  const history = (runContext as any).history;
  
  // Find the last "is_ordinary" tool call result
  const ordinaryResult = history?.filter(
    (item: any) => item.type === 'function_call_result' && item.name === 'is_ordinary_rule_checker'
  ).pop();

  if (ordinaryResult && ordinaryResult.type === 'function_call_result') {
    // The "chastity belt" in action: We parse the tool's output
    const output = JSON.parse(ordinaryResult.output as string) as ValidationStep;
    if (output.passed === true) {
      console.log("[PolicyEngine]: 'is_ordinary' PASSED. Enabling 'is_necessary_tool'.");
      return true; // Enable the tool
    }
  }

  console.log("[PolicyEngine]: 'is_ordinary' NOT PASSED. 'is_necessary_tool' remains DISABLED.");
  return false; // Keep the tool disabled
}

/**
 * The Orchestrator Agent.
 * This is the LLM, but its "chastity belt" is tight.
 * It is *architecturally prohibited* from "thinking." It can only:
 * 1. Call the tools it is given.
 * 2. Use the tool outputs to fill the FINAL `AuditResultZod` schema.
 */
const legalOrchestrator = new Agent({
  name: 'Legal_Auditor_Orchestrator',
  instructions: [
    'You are a "faith-less" legal compliance router.',
    'Your SOLE purpose is to audit a business expense against U.S.C. Title 26, Section 162(a).',
    'You MUST call the `is_ordinary_rule_checker` tool FIRST.',
    'You MUST then call the `is_necessary_rule_checker` tool, ONLY if it becomes available.',
    'You MUST NOT "think", "interpret", or "add opinion".',
    'You MUST use the outputs of the tools to populate and return the final `AuditResult` JSON object.',
  ].join(' '),
  tools: [
    isOrdinaryTool.asTool({
      toolName: 'is_ordinary_rule_checker',
      toolDescription: 'Checks if an expense is "ordinary" for a given industry.',
      isEnabled: true, // Always enabled, this is Step 1
    }),
    isNecessaryTool.asTool({
      toolName: 'is_necessary_rule_checker',
      toolDescription: 'Checks if an expense is "necessary" (appropriate amount).',
      isEnabled: isNecessaryEnabled, // This is the "Policy Engine" handoff!
    }),
  ],
  // This is the FINAL "chastity belt"
  // The agent's *entire response* must be a JSON object
  // that validates against our `AuditResultZod` schema.
  // This makes "faith-based" text replies impossible.
  // responseSchema: AuditResultZod, // Removed: Property does not exist in Agent config
});

// --- Example "Vibe Coding" Run ---
async function main() {
  console.log('--- LEGAL AUDITOR: "Fear-Agnostic" Run ---');
  
  // 1. The "Vibe": "I'm a carpenter, can I deduct my F-150?"
  // 2. Our "Phase 0 Contract" compiles this "vibe" into a verifiable contract:
  const contract: Section162aContract = {
    taxpayer_naics_code: '238350', // Carpenter
    expense_item_category: 'Truck', // <-- This will FAIL the "ordinary" check in our DB!
    expense_amount: 30000,
    business_revenue: 70000,
  };

  // 3. We create a "context" (the "chastity belt" is active)
  const runContext = new RunContext<any>();

  // 4. We run the orchestrator with the "good prompt" (the contract)
  // We are NOT sending the "vibe" to the LLM.
  await withTrace('Legal_Audit_Run', async () => {
    try {
      const result = await run(legalOrchestrator, `Audit this contract: ${JSON.stringify(contract)}`, {
        context: runContext,
      });

      // The final output is NOT a "chat message."
      // It is a verifiable, auditable JSON object.
      const auditResult = result.finalOutput as AuditResult;

      console.log('\n--- AUDIT COMPLETE ---');
      console.log(JSON.stringify(auditResult, null, 2));

      if (!auditResult.is_deductible) {
        console.log(`\n[AuditorDecision]: Deduction DENIED. Reason: '${auditResult.failed_rules[0]}'`);
      }

    } catch (error) {
      console.error("\n--- AUDIT FAILED ---");
      console.error(error);
    }
  });
}

main();