import type { PackageStep } from '../../schemas/legalSchemas';

export function sortPackageSteps(steps: PackageStep[]): PackageStep[] {
  return [...steps].sort((left, right) => left.order - right.order);
}
