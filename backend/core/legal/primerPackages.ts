import fs from 'node:fs';
import path from 'node:path';
import { PrimerPackageSchema, type PrimerPackage } from '../../../schemas/legalSchemas';
import { getConfig } from '../../config';

type Manifest = { packages: Array<{ package_id: string; file: string }> };

let cache: PrimerPackage[] | null = null;

export function __resetPrimerPackagesCacheForTests(): void {
  cache = null;
}

function resolvePackagesDir(): string {
  const configured = getConfig().PRIMER_PACKAGES_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

export function listPrimerPackages(): PrimerPackage[] {
  if (cache) {
    return cache;
  }

  const dir = resolvePackagesDir();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, 'index.json'), 'utf8'),
  ) as Manifest;
  cache = manifest.packages.map((entry) => {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, entry.file), 'utf8'));
    return PrimerPackageSchema.parse(raw);
  });

  return cache;
}

export function getPrimerPackage(packageId: string): PrimerPackage {
  const found = listPrimerPackages().find((primerPackage) => primerPackage.package_id === packageId);
  if (!found) {
    throw new Error(`Primer package not found: ${packageId}`);
  }

  return found;
}
