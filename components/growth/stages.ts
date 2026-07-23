export type GrowthStage = 0 | 1 | 2 | 3 | 4;

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  0: 'Landing',
  1: 'Areas',
  2: 'Vehicles',
  3: 'Stairway',
  4: 'Climb',
};

export function previousGrowthStage(stage: GrowthStage): GrowthStage | null {
  if (stage === 0) return null;
  return (stage - 1) as GrowthStage;
}

export function canEnterClimb(hasVehicle: boolean, stepCount: number): boolean {
  return hasVehicle && stepCount > 0;
}
