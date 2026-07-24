import { bootstrapSeedHoldings, checkCollectionHealth } from '../core/legal/commonLawEngine';

async function main() {
  const before = await checkCollectionHealth();
  console.log('[common-law] health-before', JSON.stringify(before, null, 2));

  const result = await bootstrapSeedHoldings();
  console.log('[common-law] bootstrap', JSON.stringify(result, null, 2));

  const after = await checkCollectionHealth();
  console.log('[common-law] health-after', JSON.stringify(after, null, 2));
}

main().catch((error) => {
  console.error('[common-law] bootstrap failed', error);
  process.exitCode = 1;
});
