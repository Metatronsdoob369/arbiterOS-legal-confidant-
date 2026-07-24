import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetDocsCatalogCacheForTests,
  getDocsEntry,
  listDocsDepartments,
  searchDocsCatalog,
} from './docsCatalog';

const originalEnv = {
  DOCS_CATALOG_DIR: process.env.DOCS_CATALOG_DIR,
  DOCS_FULLTEXT_DB_PATH: process.env.DOCS_FULLTEXT_DB_PATH,
};

let tempRoot = '';

beforeEach(() => {
  __resetDocsCatalogCacheForTests();
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-catalog-'));
  const docsDir = path.join(tempRoot, 'docs');
  fs.mkdirSync(path.join(docsDir, 'irs_treasury', 'catalogs'), { recursive: true });
  fs.mkdirSync(path.join(docsDir, 'fred_fed'), { recursive: true });
  fs.mkdirSync(path.join(docsDir, 'ucc'), { recursive: true });
  fs.mkdirSync(path.join(docsDir, 'cfr'), { recursive: true });

  fs.writeFileSync(
    path.join(docsDir, 'departments.json'),
    JSON.stringify({
      departments: [
        { department_id: 'irs_treasury', dir: 'irs_treasury' },
        { department_id: 'fred_fed', dir: 'fred_fed' },
        { department_id: 'ucc', dir: 'ucc' },
        { department_id: 'cfr', dir: 'cfr' },
      ],
    }),
  );

  fs.writeFileSync(
    path.join(docsDir, 'irs_treasury', 'module.json'),
    JSON.stringify({
      department_id: 'irs_treasury',
      title: 'IRS / Treasury',
      summary: 'test',
      status: 'populated',
      catalogs: [
        {
          catalog_id: 'irs_forms',
          title: 'IRS Forms',
          status: 'populated',
          entry_count: 1,
          source: 'fixture',
        },
      ],
    }),
  );

  for (const stub of ['fred_fed', 'ucc', 'cfr'] as const) {
    fs.writeFileSync(
      path.join(docsDir, stub, 'module.json'),
      JSON.stringify({
        department_id: stub,
        title: stub,
        summary: 'stub',
        status: 'stub',
        catalogs: [],
      }),
    );
  }

  fs.writeFileSync(
    path.join(docsDir, 'irs_treasury', 'catalogs', 'irs_forms.index.json'),
    JSON.stringify({
      catalog_id: 'irs_forms',
      department_id: 'irs_treasury',
      title: 'IRS Forms',
      source: 'fixture',
      ingested_at: '2026-07-22T00:00:00.000Z',
      entry_count: 1,
      entries: [
        {
          entry_id: 'irs:f8822b.pdf',
          department_id: 'irs_treasury',
          catalog_id: 'irs_forms',
          file_name: 'f8822b.pdf',
          title: 'Form 8822-B (PDF)',
          official_url: 'https://www.irs.gov/pub/irs-pdf/f8822b.pdf',
          kind: 'form',
          text_preview: 'Change of Address or Responsible Party — Business',
          source: 'fixture',
        },
      ],
    }),
  );

  process.env.DOCS_CATALOG_DIR = docsDir;
  process.env.DOCS_FULLTEXT_DB_PATH = path.join(tempRoot, 'missing.sqlite');
});

afterEach(() => {
  __resetDocsCatalogCacheForTests();
  process.env.DOCS_CATALOG_DIR = originalEnv.DOCS_CATALOG_DIR;
  process.env.DOCS_FULLTEXT_DB_PATH = originalEnv.DOCS_FULLTEXT_DB_PATH;
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe('docsCatalog', () => {
  it('lists four departments with IRS populated', () => {
    const departments = listDocsDepartments();
    expect(departments.map((d) => d.department_id)).toEqual([
      'irs_treasury',
      'fred_fed',
      'ucc',
      'cfr',
    ]);
    expect(departments[0]?.status).toBe('populated');
    expect(departments[0]?.catalogs[0]?.entry_count).toBe(1);
    expect(departments.filter((d) => d.status === 'stub')).toHaveLength(3);
  });

  it('searches catalog by form id', () => {
    const result = searchDocsCatalog('irs_forms', { q: '8822' });
    expect(result.total).toBe(1);
    expect(result.entries[0]?.entry_id).toBe('irs:f8822b.pdf');
  });

  it('returns entry detail', () => {
    const entry = getDocsEntry('irs:f8822b.pdf');
    expect(entry.title).toMatch(/8822-B/);
    expect(entry.full_text).toBeUndefined();
  });
});
