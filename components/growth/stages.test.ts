import { describe, expect, it } from 'vitest';
import {
  GROWTH_STAGE_LABELS,
  canEnterClimb,
  previousGrowthStage,
  type GrowthStage,
} from './stages';

describe('previousGrowthStage', () => {
  it('returns null on landing', () => {
    expect(previousGrowthStage(0)).toBeNull();
  });

  it('walks back one stage at a time', () => {
    const path: GrowthStage[] = [4, 3, 2, 1, 0];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(previousGrowthStage(path[i]!)).toBe(path[i + 1]!);
    }
  });
});

describe('canEnterClimb', () => {
  it('requires a vehicle', () => {
    expect(canEnterClimb(false, 3)).toBe(false);
    expect(canEnterClimb(true, 2)).toBe(true);
  });

  it('rejects an empty package even with a selected vehicle', () => {
    expect(canEnterClimb(true, 0)).toBe(false);
  });
});

describe('GROWTH_STAGE_LABELS', () => {
  it('names the five stages for UI chrome', () => {
    expect(GROWTH_STAGE_LABELS[0]).toMatch(/Landing/i);
    expect(GROWTH_STAGE_LABELS[2]).toMatch(/Vehicle/i);
    expect(GROWTH_STAGE_LABELS[3]).toMatch(/Stairway/i);
  });
});
