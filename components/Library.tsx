import React from 'react';
import type {
  DocsCatalogEntry,
  DocsDepartmentModule,
  LibraryItem,
} from '../schemas/legalSchemas';
import { apiFetch } from '../services/localApiClient';
import {
  getDocsEntry,
  listDocsDepartments,
  searchDocsCatalog,
} from '../services/docsClient';

const TYPE_ICONS: Record<LibraryItem['type'], string> = {
  quote: '💬',
  statute: '⚖️',
  article: '📰',
  book: '📕',
  paper: '📄',
  snippet: '✂️',
  note: '📝',
};

const TYPE_COLORS: Record<LibraryItem['type'], string> = {
  quote: 'border-amber-700/40 bg-amber-900/10',
  statute: 'border-emerald-700/40 bg-emerald-900/10',
  article: 'border-blue-700/40 bg-blue-900/10',
  book: 'border-red-700/40 bg-red-900/10',
  paper: 'border-violet-700/40 bg-violet-900/10',
  snippet: 'border-teal-700/40 bg-teal-900/10',
  note: 'border-neutral-600/40 bg-neutral-800/10',
};

type LibraryTab = 'working_set' | 'departments';

const gold = '#d4af37';
const ink = '#e8dcc8';
const mute = '#8b7355';
const panel = '#2a1c12';
const border = '#3d2b1f';

export const Library: React.FC = () => {
  const [tab, setTab] = React.useState<LibraryTab>('working_set');
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<LibraryItem['type'] | 'all'>('all');
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newItem, setNewItem] = React.useState({
    type: 'note' as LibraryItem['type'],
    title: '',
    content: '',
    source: '',
    citation: '',
    tags: '',
  });

  const [departments, setDepartments] = React.useState<DocsDepartmentModule[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = React.useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = React.useState('');
  const [catalogKind, setCatalogKind] = React.useState<string>('all');
  const [catalogEntries, setCatalogEntries] = React.useState<DocsCatalogEntry[]>([]);
  const [catalogTotal, setCatalogTotal] = React.useState(0);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState<
    (DocsCatalogEntry & { full_text?: string }) | null
  >(null);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{ items: LibraryItem[] }>('/api/memories');
      setItems(payload.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  React.useEffect(() => {
    if (tab !== 'departments') return;
    setDepartmentsLoading(true);
    void listDocsDepartments()
      .then((list) => {
        setDepartments(list);
        setSelectedDepartmentId((current) => current ?? list[0]?.department_id ?? null);
      })
      .catch(() => setDepartments([]))
      .finally(() => setDepartmentsLoading(false));
  }, [tab]);

  const selectedDepartment = departments.find((d) => d.department_id === selectedDepartmentId) ?? null;
  const primaryCatalog = selectedDepartment?.catalogs.find((c) => c.status === 'populated')
    ?? selectedDepartment?.catalogs[0]
    ?? null;

  React.useEffect(() => {
    if (tab !== 'departments' || !primaryCatalog || primaryCatalog.status !== 'populated') {
      setCatalogEntries([]);
      setCatalogTotal(0);
      return;
    }

    const handle = window.setTimeout(() => {
      setCatalogLoading(true);
      void searchDocsCatalog(primaryCatalog.catalog_id, {
        q: catalogQuery.trim() || undefined,
        kind: catalogKind === 'all' ? undefined : catalogKind,
        limit: 40,
      })
        .then((result) => {
          setCatalogEntries(result.entries);
          setCatalogTotal(result.total);
        })
        .catch(() => {
          setCatalogEntries([]);
          setCatalogTotal(0);
        })
        .finally(() => setCatalogLoading(false));
    }, 200);

    return () => window.clearTimeout(handle);
  }, [tab, primaryCatalog?.catalog_id, primaryCatalog?.status, catalogQuery, catalogKind]);

  const filteredItems = items
    .filter((item) => {
      const search = searchQuery.trim().toLowerCase();
      const matchesSearch =
        search === ''
        || item.title.toLowerCase().includes(search)
        || item.content.toLowerCase().includes(search)
        || item.tags.some((tag) => tag.toLowerCase().includes(search));
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((left, right) => {
      if (left.pinned && !right.pinned) return -1;
      if (!left.pinned && right.pinned) return 1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  const addItem = async () => {
    if (!newItem.title.trim() || !newItem.content.trim()) return;

    await apiFetch('/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        entryType: newItem.type,
        title: newItem.title,
        content: newItem.content,
        source: newItem.source,
        citation: newItem.citation,
        tags: newItem.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        pinned: false,
      }),
    });

    setNewItem({ type: 'note', title: '', content: '', source: '', citation: '', tags: '' });
    setShowAddForm(false);
    await loadItems();
  };

  const togglePin = async (item: LibraryItem) => {
    await apiFetch(`/api/memories/${item.id}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !item.pinned }),
    });
    await loadItems();
  };

  const deleteItem = async (id: string) => {
    await apiFetch(`/api/memories/${id}`, {
      method: 'DELETE',
    });
    await loadItems();
  };

  const openEntry = async (entryId: string) => {
    try {
      const detail = await getDocsEntry(entryId);
      setSelectedEntry(detail);
    } catch {
      setSelectedEntry(null);
    }
  };

  return (
    <div
      data-testid="library-container"
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1a0f0a 0%, #0d0806 100%)' }}
    >
      <div className="px-6 md:px-8 pt-6 pb-4 border-b" style={{ borderColor: border }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              data-testid="heading-library"
              className="text-2xl font-bold uppercase tracking-tight"
              style={{ fontFamily: 'Merriweather, serif', color: gold }}
            >
              Library
            </h2>
            <p className="text-xs mt-1 tracking-wider" style={{ color: mute }}>
              Working set and institutional document departments
            </p>
          </div>
          {tab === 'working_set' && (
            <button
              onClick={() => setShowAddForm((current) => !current)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all"
              style={{
                background: showAddForm ? '#3d2b1f' : 'linear-gradient(135deg, #d4af37, #b8941e)',
                color: showAddForm ? gold : '#1a0f0a',
                border: `1px solid ${gold}`,
              }}
            >
              {showAddForm ? 'Cancel' : '+ Add Entry'}
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4" data-testid="library-tabs">
          {([
            ['working_set', 'Working set'],
            ['departments', 'Departments'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              data-testid={`library-tab-${id}`}
              onClick={() => setTab(id)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest rounded"
              style={{
                background: tab === id ? gold : panel,
                color: tab === id ? '#1a0f0a' : mute,
                border: `1px solid ${border}`,
                fontWeight: tab === id ? 700 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'working_set' && showAddForm && (
          <div className="p-4 rounded-lg mb-4" style={{ background: '#1e1410', border: `1px solid ${border}` }}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select
                value={newItem.type}
                onChange={(event) => setNewItem((current) => ({ ...current, type: event.target.value as LibraryItem['type'] }))}
                className="px-3 py-2 text-xs rounded outline-none"
                style={{ background: panel, border: `1px solid ${border}`, color: gold }}
              >
                {Object.entries(TYPE_ICONS).map(([type, icon]) => (
                  <option key={type} value={type}>{icon} {type}</option>
                ))}
              </select>
              <input
                value={newItem.source}
                onChange={(event) => setNewItem((current) => ({ ...current, source: event.target.value }))}
                placeholder="Source..."
                className="px-3 py-2 text-xs rounded outline-none"
                style={{ background: panel, border: `1px solid ${border}`, color: ink }}
              />
            </div>
            <input
              value={newItem.title}
              onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))}
              placeholder="Title..."
              className="w-full px-3 py-2 text-xs rounded outline-none mb-3"
              style={{ background: panel, border: `1px solid ${border}`, color: ink }}
            />
            <textarea
              value={newItem.content}
              onChange={(event) => setNewItem((current) => ({ ...current, content: event.target.value }))}
              placeholder="Content..."
              className="w-full px-3 py-2 text-xs rounded outline-none mb-3 resize-none h-20"
              style={{ background: panel, border: `1px solid ${border}`, color: ink }}
            />
            <div className="flex gap-3">
              <input
                value={newItem.citation}
                onChange={(event) => setNewItem((current) => ({ ...current, citation: event.target.value }))}
                placeholder="Citation (optional)..."
                className="flex-1 px-3 py-2 text-xs rounded outline-none"
                style={{ background: panel, border: `1px solid ${border}`, color: ink }}
              />
              <input
                value={newItem.tags}
                onChange={(event) => setNewItem((current) => ({ ...current, tags: event.target.value }))}
                placeholder="Tags (comma-separated)..."
                className="flex-1 px-3 py-2 text-xs rounded outline-none"
                style={{ background: panel, border: `1px solid ${border}`, color: ink }}
              />
              <button
                onClick={() => void addItem()}
                className="px-4 py-2 text-xs font-bold uppercase rounded"
                style={{ background: gold, color: '#1a0f0a' }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {tab === 'working_set' && (
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your library..."
                className="w-full px-4 py-2.5 text-xs rounded-lg outline-none pl-9"
                style={{ background: panel, border: `1px solid ${border}`, color: ink }}
              />
              <span className="absolute left-3 top-2.5 text-sm" style={{ color: mute }}>🔍</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest rounded transition-all ${filterType === 'all' ? 'font-bold' : ''}`}
                style={{
                  background: filterType === 'all' ? gold : panel,
                  color: filterType === 'all' ? '#1a0f0a' : mute,
                  border: `1px solid ${border}`,
                }}
              >
                All
              </button>
              {(['statute', 'quote', 'snippet', 'article', 'note'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-[10px] uppercase tracking-widest rounded transition-all ${filterType === type ? 'font-bold' : ''}`}
                  style={{
                    background: filterType === type ? gold : panel,
                    color: filterType === type ? '#1a0f0a' : mute,
                    border: `1px solid ${border}`,
                  }}
                >
                  {TYPE_ICONS[type]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === 'working_set' ? (
        <>
          <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-4 scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center h-full opacity-30">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-widest" style={{ color: mute }}>
                    Loading library
                  </div>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex items-center justify-center h-full opacity-30">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-widest" style={{ color: mute }}>
                    {searchQuery ? 'No results found' : 'Your library is empty'}
                  </div>
                </div>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`group p-4 rounded-lg border transition-all hover:-translate-y-0.5 ${TYPE_COLORS[item.type]}`}
                  style={{
                    boxShadow: item.pinned ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{TYPE_ICONS[item.type]}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: mute }}>
                        {item.type}
                      </span>
                      {item.pinned && <span className="text-[9px]" style={{ color: gold }}>📌</span>}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => void togglePin(item)} className="text-xs" title="Pin/Unpin">📌</button>
                      <button onClick={() => void deleteItem(item.id)} className="text-xs text-red-400" title="Delete">×</button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold mb-2" style={{ fontFamily: 'Merriweather, serif', color: ink }}>
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: '#a89070' }}>
                    {item.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-full"
                          style={{ background: panel, color: mute, border: `1px solid ${border}` }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {item.citation && (
                      <span className="text-[9px] italic" style={{ color: gold }}>
                        {item.citation}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: border, background: '#150d08' }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#5a4030' }}>
              {items.length} entries • {items.filter((item) => item.pinned).length} pinned
            </span>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#5a4030' }}>
              ArbiterOS Library
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 flex" data-testid="docs-departments">
          <aside className="w-56 shrink-0 border-r overflow-y-auto p-4 space-y-2" style={{ borderColor: border }}>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: mute }}>
              Departments
            </div>
            {departmentsLoading ? (
              <div className="text-xs" style={{ color: mute }}>Loading…</div>
            ) : (
              departments.map((dept) => (
                <button
                  key={dept.department_id}
                  data-testid={`docs-dept-${dept.department_id}`}
                  onClick={() => {
                    setSelectedDepartmentId(dept.department_id);
                    setSelectedEntry(null);
                    setCatalogQuery('');
                  }}
                  className="w-full text-left px-3 py-2 rounded"
                  style={{
                    background: selectedDepartmentId === dept.department_id ? '#3d2b1f' : 'transparent',
                    border: `1px solid ${selectedDepartmentId === dept.department_id ? gold : border}`,
                    color: ink,
                  }}
                >
                  <div className="text-xs font-bold" style={{ fontFamily: 'Merriweather, serif' }}>
                    {dept.title}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: mute }}>
                    {dept.status === 'populated' ? 'Populated' : 'Scaffold'}
                  </div>
                </button>
              ))
            )}
          </aside>

          <div className="flex-1 min-w-0 flex flex-col">
            {selectedDepartment && (
              <div className="px-6 pt-4 pb-3 border-b" style={{ borderColor: border }}>
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Merriweather, serif', color: gold }}>
                  {selectedDepartment.title}
                </h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: mute }}>
                  {selectedDepartment.summary}
                </p>
                {primaryCatalog && primaryCatalog.status === 'populated' && (
                  <div className="flex gap-2 mt-3">
                    <input
                      data-testid="docs-catalog-search"
                      value={catalogQuery}
                      onChange={(event) => setCatalogQuery(event.target.value)}
                      placeholder="Search forms, instructions, publications…"
                      className="flex-1 px-3 py-2 text-xs rounded outline-none"
                      style={{ background: panel, border: `1px solid ${border}`, color: ink }}
                    />
                    <select
                      value={catalogKind}
                      onChange={(event) => setCatalogKind(event.target.value)}
                      className="px-3 py-2 text-xs rounded outline-none"
                      style={{ background: panel, border: `1px solid ${border}`, color: gold }}
                    >
                      <option value="all">All kinds</option>
                      <option value="form">Forms</option>
                      <option value="instruction">Instructions</option>
                      <option value="publication">Publications</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {!selectedDepartment ? null : selectedDepartment.status === 'stub' || !primaryCatalog || primaryCatalog.status === 'stub' ? (
                  <div
                    className="p-4 rounded"
                    style={{ background: '#1e1410', border: `1px solid ${border}` }}
                    data-testid="docs-dept-stub"
                  >
                    <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: gold }}>
                      Scaffold ready
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: mute }}>
                      This department module is wired for ingest. Drop a catalog index under
                      {' '}
                      <code style={{ color: ink }}>seeds/docs/{selectedDepartment.department_id}/catalogs/</code>
                      {' '}
                      and flip status to populated when content lands.
                    </p>
                  </div>
                ) : catalogLoading ? (
                  <div className="text-xs" style={{ color: mute }}>Searching catalog…</div>
                ) : catalogEntries.length === 0 ? (
                  <div className="text-xs" style={{ color: mute }}>No matches</div>
                ) : (
                  <>
                    <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: mute }}>
                      {catalogTotal} matches
                      {primaryCatalog ? ` · ${primaryCatalog.title}` : ''}
                    </div>
                    {catalogEntries.map((entry) => (
                      <button
                        key={entry.entry_id}
                        data-testid={`docs-entry-${entry.file_name}`}
                        onClick={() => void openEntry(entry.entry_id)}
                        className="w-full text-left p-3 rounded transition-colors"
                        style={{
                          background: selectedEntry?.entry_id === entry.entry_id ? '#3d2b1f' : '#1e1410',
                          border: `1px solid ${border}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: gold }}>
                            {entry.kind}
                          </span>
                          <span className="text-[9px]" style={{ color: mute }}>{entry.file_name}</span>
                        </div>
                        <div className="text-xs font-bold" style={{ color: ink }}>{entry.title}</div>
                        {entry.text_preview && (
                          <p className="text-[11px] mt-1 line-clamp-2" style={{ color: mute }}>
                            {entry.text_preview}
                          </p>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {selectedEntry && (
                <aside
                  className="w-[42%] border-l overflow-y-auto p-5"
                  style={{ borderColor: border, background: '#150d08' }}
                  data-testid="docs-entry-detail"
                >
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: mute }}>
                    {selectedEntry.kind} · {selectedEntry.file_name}
                  </div>
                  <h4 className="text-sm font-bold mb-2" style={{ fontFamily: 'Merriweather, serif', color: gold }}>
                    {selectedEntry.title}
                  </h4>
                  <a
                    href={selectedEntry.official_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] underline break-all"
                    style={{ color: ink }}
                  >
                    {selectedEntry.official_url}
                  </a>
                  <pre
                    className="mt-4 text-[11px] leading-relaxed whitespace-pre-wrap font-sans"
                    style={{ color: '#a89070' }}
                  >
                    {selectedEntry.full_text || selectedEntry.text_preview || 'No text available. Run npm run ingest:irs-forms for full text.'}
                  </pre>
                </aside>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
