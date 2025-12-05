/**
 * This is the "FEAR-AGNOSTIC" PROOF.
 * * This test file validates our "Policy Engine" (the "if-this-then-that").
 * It proves, in isolation, that our "chastity belt" logic works.
 */

import { describe, it, expect } from 'vitest';
import { RunContext, FunctionCallResultItem } from '@openai/agents';
import { isNecessaryEnabled } from './legal_auditor_orchistrator.js';
import { ValidationStep } from './legal_auditor_schemas.js';

describe('Legal Auditor Policy Engine (isNecessaryEnabled)', () => {

  it('should return FALSE if the history is empty', () => {
    const context = new RunContext<any>();
    expect(isNecessaryEnabled({ runContext: context })).toBe(false);
  });

  it('should return FALSE if the "is_ordinary" tool has NOT run', () => {
    const context = new RunContext<any>();
    (context as any).history = [
      { type: 'message', role: 'user', content: 'hello' }
    ];
    expect(isNecessaryEnabled({ runContext: context })).toBe(false);
  });

  it('should return FALSE if the "is_ordinary" tool ran but FAILED', () => {
    const validationResult: ValidationStep = {
      rule_id: 'rule_is_ordinary',
      passed: false, // <-- THE FAILURE
      details: 'FAILED: ...',
      evidence_source: 'LIVE_QUERY:...',
      timestamp: new Date().toISOString()
    };
    
    const toolResult: FunctionCallResultItem = {
      type: 'function_call_result',
      callId: 'call_1',
      name: 'is_ordinary_rule_checker',
      output: JSON.stringify(validationResult)
    };
    
    const context = new RunContext<any>();
    (context as any).history = [ toolResult ];
    
    expect(isNecessaryEnabled({ runContext: context })).toBe(false);
  });

  it('should return TRUE if the "is_ordinary" tool ran and PASSED', () => {
    const validationResult: ValidationStep = {
      rule_id: 'rule_is_ordinary',
      passed: true, // <-- THE SUCCESS
      details: 'PASSED: ...',
      evidence_source: 'LIVE_QUERY:...',
      timestamp: new Date().toISOString()
    };
    
    const toolResult: FunctionCallResultItem = {
      type: 'function_call_result',
      callId: 'call_1',
      name: 'is_ordinary_rule_checker',
      output: JSON.stringify(validationResult)
    };
    
    const context = new RunContext<any>();
    (context as any).history = [ toolResult ];
    
    // This is the "fear-agnostic" proof of our "if-this-then-that" logic
    expect(isNecessaryEnabled({ runContext: context })).toBe(true);
  });

  it('should return FALSE if the tool output is corrupted JSON', () => {
    const toolResult: FunctionCallResultItem = {
      type: 'function_call_result',
      callId: 'call_1',
      name: 'is_ordinary_rule_checker',
      output: '{ "passed": true, "details": "corrupted... ' // <-- Corrupted JSON
    };
    
    const context = new RunContext<any>();
    (context as any).history = [ toolResult ];
    
    // The "chastity belt" holds. It doesn't crash, it just returns false.
    expect(isNecessaryEnabled({ runContext: context })).toBe(false);
  });

});