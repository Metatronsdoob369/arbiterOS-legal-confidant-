import type { PrimerPackage } from '../../schemas/legalSchemas';

export type GrowthVehicle = {
  id: string;
  label: string;
  areaId: string;
};

const OVERLAY: Record<string, Array<{ id: string; label: string }>> = {
  contract_navigation: [
    { id: 'cn-auto-dealer', label: 'Auto dealership negotiation' },
    { id: 'cn-service-msa', label: 'Service / MSA review' },
    { id: 'cn-lease-read', label: 'Lease walkthrough' },
    { id: 'cn-general', label: 'General contract sequence' },
  ],
};

export function vehiclesForPackage(pkg: PrimerPackage): GrowthVehicle[] {
  const overlay = OVERLAY[pkg.package_id];
  if (overlay && overlay.length > 0) {
    return overlay.map((item) => ({
      id: item.id,
      label: item.label,
      areaId: pkg.package_id,
    }));
  }

  return [
    {
      id: `${pkg.package_id}-primary`,
      label: `${pkg.title} — primary path`,
      areaId: pkg.package_id,
    },
  ];
}
