import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  DocsCatalogEntrySchema,
  DocsCatalogIndexSchema,
  DocsDepartmentModuleSchema,
  type DocsCatalogEntry,
  type DocsCatalogIndex,
  type DocsDepartmentModule,
} from '../../../schemas/legalSchemas';
import { getConfig } from '../../config';

type DepartmentsManifest = {
  departments: Array<{ department_id: string; dir: string }>;
};

let departmentsCache: DocsDepartmentModule[] | null = null;
let catalogCache: Map<string, DocsCatalogIndex> | null = null;

export function __resetDocsCatalogCacheForTests(): void {
  departmentsCache = null;
  catalogCache = null;
}

function resolveDocsDir(): string {
  const configured = getConfig().DOCS_CATALOG_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function resolveFullTextDbPath(): string {
  const configured = getConfig().DOCS_FULLTEXT_DB_PATH;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function loadCatalogIndex(catalogId: string, departmentDir: string): DocsCatalogIndex | null {
  const indexPath = path.join(
    resolveDocsDir(),
    departmentDir,
    'catalogs',
    `${catalogId}.index.json`,
  );
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  return DocsCatalogIndexSchema.parse(raw);
}

function ensureCatalogCache(): Map<string, DocsCatalogIndex> {
  if (catalogCache) {
    return catalogCache;
  }
  catalogCache = new Map();
  const docsDir = resolveDocsDir();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(docsDir, 'departments.json'), 'utf8'),
  ) as DepartmentsManifest;

  for (const entry of manifest.departments) {
    const modulePath = path.join(docsDir, entry.dir, 'module.json');
    if (!fs.existsSync(modulePath)) continue;
    const moduleRaw = JSON.parse(fs.readFileSync(modulePath, 'utf8')) as DocsDepartmentModule;
    for (const catalog of moduleRaw.catalogs ?? []) {
      const index = loadCatalogIndex(catalog.catalog_id, entry.dir);
      if (index) {
        catalogCache.set(catalog.catalog_id, index);
      }
    }
  }
  return catalogCache;
}

export function listDocsDepartments(): DocsDepartmentModule[] {
  if (departmentsCache) {
    return departmentsCache;
  }

  const docsDir = resolveDocsDir();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(docsDir, 'departments.json'), 'utf8'),
  ) as DepartmentsManifest;

  const catalogs = ensureCatalogCache();
  departmentsCache = manifest.departments.map((entry) => {
    const modulePath = path.join(docsDir, entry.dir, 'module.json');
    const module = DocsDepartmentModuleSchema.parse(
      JSON.parse(fs.readFileSync(modulePath, 'utf8')),
    );
    return {
      ...module,
      catalogs: module.catalogs.map((catalog) => {
        const index = catalogs.get(catalog.catalog_id);
        return {
          ...catalog,
          entry_count: index?.entry_count ?? catalog.entry_count,
          status: index ? 'populated' as const : catalog.status,
        };
      }),
    };
  });

  return departmentsCache;
}

export function getDocsDepartment(departmentId: string): DocsDepartmentModule {
  const found = listDocsDepartments().find((dept) => dept.department_id === departmentId);
  if (!found) {
    throw new Error(`Docs department not found: ${departmentId}`);
  }
  return found;
}

export function getDocsCatalog(catalogId: string): DocsCatalogIndex {
  const found = ensureCatalogCache().get(catalogId);
  if (!found) {
    throw new Error(`Docs catalog not found: ${catalogId}`);
  }
  return found;
}

export type DocsCatalogQuery = {
  q?: string;
  kind?: string;
  limit?: number;
  offset?: number;
};

export function searchDocsCatalog(
  catalogId: string,
  query: DocsCatalogQuery = {},
): { total: number; entries: DocsCatalogEntry[] } {
  const catalog = getDocsCatalog(catalogId);
  const needle = query.q?.trim().toLowerCase() ?? '';
  const kind = query.kind?.trim().toLowerCase();
  const filtered = catalog.entries.filter((entry) => {
    if (kind && entry.kind !== kind) return false;
    if (!needle) return true;
    return (
      entry.title.toLowerCase().includes(needle)
      || entry.file_name.toLowerCase().includes(needle)
      || entry.entry_id.toLowerCase().includes(needle)
      || entry.text_preview.toLowerCase().includes(needle)
    );
  });

  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(200, Math.max(1, query.limit ?? 50));
  return {
    total: filtered.length,
    entries: filtered.slice(offset, offset + limit),
  };
}

export function getDocsEntry(entryId: string): DocsCatalogEntry & { full_text?: string } {
  for (const catalog of ensureCatalogCache().values()) {
    const entry = catalog.entries.find((item) => item.entry_id === entryId);
    if (!entry) continue;
    const parsed = DocsCatalogEntrySchema.parse(entry);
    const fullText = readFullText(entryId);
    return fullText ? { ...parsed, full_text: fullText } : parsed;
  }
  throw new Error(`Docs entry not found: ${entryId}`);
}

function readFullText(entryId: string): string | undefined {
  const dbPath = resolveFullTextDbPath();
  if (!fs.existsSync(dbPath)) {
    return undefined;
  }
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const row = db.prepare('SELECT full_text FROM entries WHERE entry_id = ?').get(entryId) as
      | { full_text: string }
      | undefined;
    return row?.full_text;
  } finally {
    db.close();
  }
}
