import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Vite Configuration Security', () => {
  it('does not contain process.env.API_KEY or process.env.OPENAI_API_KEY in vite.config.ts define block', () => {
    const configPath = path.resolve(process.cwd(), 'vite.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');

    expect(content).not.toContain("'process.env.API_KEY'");
    expect(content).not.toContain("'process.env.OPENAI_API_KEY'");
  });
});
