import type {
  DocsCatalogEntry,
  DocsDepartmentModule,
} from '../schemas/legalSchemas';
import { apiFetch } from './localApiClient';

export async function listDocsDepartments(): Promise<DocsDepartmentModule[]> {
  const payload = await apiFetch<{ departments: DocsDepartmentModule[] }>(
    '/api/docs/departments',
  );
  return payload.departments;
}

export async function getDocsDepartment(id: string): Promise<DocsDepartmentModule> {
  return apiFetch<DocsDepartmentModule>(`/api/docs/departments/${encodeURIComponent(id)}`);
}

export async function searchDocsCatalog(
  catalogId: string,
  options: { q?: string; kind?: string; limit?: number; offset?: number } = {},
): Promise<{ catalog_id: string; total: number; entries: DocsCatalogEntry[] }> {
  const params = new URLSearchParams();
  if (options.q) params.set('q', options.q);
  if (options.kind) params.set('kind', options.kind);
  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.offset != null) params.set('offset', String(options.offset));
  const qs = params.toString();
  return apiFetch(
    `/api/docs/catalogs/${encodeURIComponent(catalogId)}${qs ? `?${qs}` : ''}`,
  );
}

export async function getDocsEntry(
  entryId: string,
): Promise<DocsCatalogEntry & { full_text?: string }> {
  return apiFetch(`/api/docs/entries/${encodeURIComponent(entryId)}`);
}
