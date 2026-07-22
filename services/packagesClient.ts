import type { PrimerPackage } from '../schemas/legalSchemas';
import { apiFetch } from './localApiClient';

export async function listPackages(): Promise<PrimerPackage[]> {
  const payload = await apiFetch<{ packages: PrimerPackage[] }>('/api/packages');
  return payload.packages;
}
