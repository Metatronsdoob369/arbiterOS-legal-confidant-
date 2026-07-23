import { describe, expect, it } from 'vitest';

describe('growth chrome modules', () => {
  it('exports folder, area card, and vehicle tile', async () => {
    const folder = await import('./GrowthFolder');
    const card = await import('./GrowthAreaCard');
    const tile = await import('./GrowthVehicleTile');
    expect(typeof folder.GrowthFolder).toBe('function');
    expect(typeof card.GrowthAreaCard).toBe('function');
    expect(typeof tile.GrowthVehicleTile).toBe('function');
  });
});
