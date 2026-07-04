/**
 * 📚 The Library — Legal Reference Storage
 * 
 * Store quotes, law snippets, articles, books, papers.
 * Your personal legal arsenal, organized and searchable.
 */

import React, { useState, useMemo } from 'react';
import type { LibraryItem } from '../schemas/legalSchemas';

const INITIAL_ITEMS: LibraryItem[] = [
  {
    id: '1',
    type: 'statute',
    title: 'UCC § 3-104 — Negotiable Instrument',
    content: '(a) ...means an unconditional promise or order to pay a fixed amount of money, with or without interest...',
    source: 'Uniform Commercial Code',
    citation: 'UCC § 3-104',
    tags: ['ucc', 'negotiable', 'instrument'],
    createdAt: new Date().toISOString(),
    pinned: true,
  },
  {
    id: '2',
    type: 'quote',
    title: 'The law is reason, free from passion.',
    content: 'The law is reason, free from passion.',
    source: 'Aristotle, Politics',
    tags: ['philosophy', 'jurisprudence'],
    createdAt: new Date().toISOString(),
    pinned: false,
  },
  {
    id: '3',
    type: 'snippet',
    title: 'FTC Credit Rule — Confession of Judgment',
    content: 'It is an unfair act or practice for a lender to take from a consumer an obligation that constitutes a cognovit or confession of judgment.',
    source: '16 CFR § 444.2',
    citation: '16 CFR § 444.2',
    tags: ['ftc', 'consumer', 'credit'],
    createdAt: new Date().toISOString(),
    pinned: true,
  },
];

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

export const Library: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>(INITIAL_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LibraryItem['type'] | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'note' as LibraryItem['type'],
    title: '',
    content: '',
    source: '',
    citation: '',
    tags: '',
  });

  const filteredItems = useMemo(() => {
    // ⚡ Bolt Optimization: Cache toLowerCase() outside the filter loop
    const query = searchQuery.toLowerCase();

    return items
      .filter(item => {
        // ⚡ Bolt Optimization: Early return for type mismatch (O(1)) to skip expensive string operations
        if (filterType !== 'all' && item.type !== filterType) return false;

        // Skip string operations if no query
        if (query === '') return true;

        return item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.tags.some(t => t.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // ⚡ Bolt Optimization: ISO 8601 strings sort lexically, avoiding expensive new Date() parsing
        if (a.createdAt > b.createdAt) return -1;
        if (a.createdAt < b.createdAt) return 1;
        return 0;
      });
  }, [items, searchQuery, filterType]);

  const addItem = () => {
    if (!newItem.title.trim() || !newItem.content.trim()) return;
    const item: LibraryItem = {
      id: Date.now().toString(),
      type: newItem.type,
      title: newItem.title,
      content: newItem.content,
      source: newItem.source || undefined,
      citation: newItem.citation || undefined,
      tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setItems(prev => [item, ...prev]);
    setNewItem({ type: 'note', title: '', content: '', source: '', citation: '', tags: '' });
    setShowAddForm(false);
  };

  const togglePin = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, pinned: !item.pinned } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div data-testid="library-container" className="h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a0f0a 0%, #0d0806 100%)' }}>
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 border-b" style={{ borderColor: '#3d2b1f' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 data-testid="heading-library" className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Merriweather, serif', color: '#d4af37' }}>
              📚 The Library
            </h2>
            <p className="text-xs mt-1 tracking-wider" style={{ color: '#8b7355' }}>
              Your legal arsenal. Quotes, statutes, articles, and ammunition.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all"
            style={{
              background: showAddForm ? '#3d2b1f' : 'linear-gradient(135deg, #d4af37, #b8941e)',
              color: showAddForm ? '#d4af37' : '#1a0f0a',
              border: '1px solid #d4af37',
            }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Entry'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 rounded-lg mb-4" style={{ background: '#1e1410', border: '1px solid #3d2b1f' }}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select
                value={newItem.type}
                onChange={e => setNewItem(prev => ({ ...prev, type: e.target.value as LibraryItem['type'] }))}
                className="px-3 py-2 text-xs rounded outline-none"
                style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#d4af37' }}
              >
                {Object.entries(TYPE_ICONS).map(([type, icon]) => (
                  <option key={type} value={type}>{icon} {type}</option>
                ))}
              </select>
              <input
                value={newItem.source}
                onChange={e => setNewItem(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Source..."
                className="px-3 py-2 text-xs rounded outline-none"
                style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
              />
            </div>
            <input
              value={newItem.title}
              onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Title..."
              className="w-full px-3 py-2 text-xs rounded outline-none mb-3"
              style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
            />
            <textarea
              value={newItem.content}
              onChange={e => setNewItem(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Content..."
              className="w-full px-3 py-2 text-xs rounded outline-none mb-3 resize-none h-20"
              style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
            />
            <div className="flex gap-3">
              <input
                value={newItem.citation}
                onChange={e => setNewItem(prev => ({ ...prev, citation: e.target.value }))}
                placeholder="Citation (optional)..."
                className="flex-1 px-3 py-2 text-xs rounded outline-none"
                style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
              />
              <input
                value={newItem.tags}
                onChange={e => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags (comma-separated)..."
                className="flex-1 px-3 py-2 text-xs rounded outline-none"
                style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
              />
              <button
                onClick={addItem}
                className="px-4 py-2 text-xs font-bold uppercase rounded"
                style={{ background: '#d4af37', color: '#1a0f0a' }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full px-4 py-2.5 text-xs rounded-lg outline-none pl-9"
              style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
            />
            <span className="absolute left-3 top-2.5 text-sm" style={{ color: '#8b7355' }}>🔍</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest rounded transition-all ${filterType === 'all' ? 'font-bold' : ''}`}
              style={{
                background: filterType === 'all' ? '#d4af37' : '#2a1c12',
                color: filterType === 'all' ? '#1a0f0a' : '#8b7355',
                border: '1px solid #3d2b1f',
              }}
            >
              All
            </button>
            {(['statute', 'quote', 'snippet', 'article', 'note'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest rounded transition-all ${filterType === type ? 'font-bold' : ''}`}
                style={{
                  background: filterType === type ? '#d4af37' : '#2a1c12',
                  color: filterType === type ? '#1a0f0a' : '#8b7355',
                  border: '1px solid #3d2b1f',
                }}
              >
                {TYPE_ICONS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-4 scrollbar-hide">
        {filteredItems.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-30">
            <div className="text-center">
              <div className="text-4xl mb-3">📚</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: '#8b7355' }}>
                {searchQuery ? 'No results found' : 'Your library is empty'}
              </div>
            </div>
          </div>
        )}

        {filteredItems.map(item => (
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
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#8b7355' }}>
                  {item.type}
                </span>
                {item.pinned && <span className="text-[9px]" style={{ color: '#d4af37' }}>📌</span>}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => togglePin(item.id)} className="text-xs hover:scale-110 transition-transform" title="Pin/Unpin">
                  📌
                </button>
                <button onClick={() => deleteItem(item.id)} className="text-xs hover:scale-110 transition-transform text-red-400" title="Delete">
                  ×
                </button>
              </div>
            </div>
            <h3 className="text-sm font-bold mb-2" style={{ fontFamily: 'Merriweather, serif', color: '#e8dcc8' }}>
              {item.title}
            </h3>
            <p className="text-xs leading-relaxed mb-3" style={{ color: '#a89070' }}>
              {item.content}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-full"
                    style={{ background: '#2a1c12', color: '#8b7355', border: '1px solid #3d2b1f' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {item.citation && (
                <span className="text-[9px] italic" style={{ color: '#d4af37' }}>
                  {item.citation}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: '#3d2b1f', background: '#150d08' }}>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: '#5a4030' }}>
          {items.length} entries • {items.filter(i => i.pinned).length} pinned
        </span>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: '#5a4030' }}>
          ArbiterOS Library v1.0
        </span>
      </div>
    </div>
  );
};
