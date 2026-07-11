/**
 * 🔗 Evidence Board — The Whiteboard
 * 
 * A visual canvas for connecting evidence, witnesses, statutes,
 * and arguments. Build your case like you're solving a conspiracy.
 * Because sometimes, you are.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { EvidenceNode, EvidenceConnection } from '../schemas/legalSchemas';

const NODE_COLORS: Record<EvidenceNode['type'], { bg: string; border: string; text: string }> = {
  evidence:  { bg: '#1a2332', border: '#2563eb', text: '#93c5fd' },
  witness:   { bg: '#1a2520', border: '#16a34a', text: '#86efac' },
  statute:   { bg: '#2a1c12', border: '#d4af37', text: '#fbbf24' },
  argument:  { bg: '#271a2e', border: '#9333ea', text: '#c084fc' },
  document:  { bg: '#1e1410', border: '#b45309', text: '#fbbf24' },
  timeline:  { bg: '#1a1a2e', border: '#6366f1', text: '#a5b4fc' },
};

const INITIAL_NODES: EvidenceNode[] = [
  { id: '1', label: 'Contract Exhibit A', type: 'document', content: 'Original promissory note with suspicious terms', x: 100, y: 100 },
  { id: '2', label: 'UCC 3-104 Violation', type: 'statute', content: 'Instrument fails negotiability requirements', x: 400, y: 80 },
  { id: '3', label: 'Borrower Testimony', type: 'witness', content: 'Claims terms were not disclosed at signing', x: 250, y: 280 },
  { id: '4', label: 'Confession of Judgment', type: 'evidence', content: 'Hidden cognovit clause found in paragraph 14', x: 600, y: 200 },
  { id: '5', label: 'FTC 16 CFR § 444.2', type: 'statute', content: 'Confession of judgment prohibited in consumer contracts', x: 600, y: 380 },
];

const INITIAL_CONNECTIONS: EvidenceConnection[] = [
  { id: 'c1', from: '1', to: '2', label: 'violates', strength: 'strong' },
  { id: 'c2', from: '1', to: '4', label: 'contains', strength: 'strong' },
  { id: 'c3', from: '3', to: '1', label: 'references', strength: 'moderate' },
  { id: 'c4', from: '4', to: '5', label: 'prohibited by', strength: 'strong' },
];

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const NODE_MARGIN = 50;

// ⚡ Bolt Optimization: Extract Node rendering to a memoized component
// This prevents React from re-rendering every single node (and doing full DOM reconciliation)
// on every mouse move event during drag-and-drop.
const MemoizedNode = React.memo<{
  node: EvidenceNode;
  isSelected: boolean;
  isConnectTarget: boolean;
  isDragging: boolean;
  colors: { bg: string; border: string; text: string };
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}>(({ node, isSelected, isConnectTarget, isDragging, colors, onMouseDown, onClick, onDelete }) => {
  return (
    <div
      className="absolute group"
      style={{
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        zIndex: isSelected ? 20 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={e => onMouseDown(e, node.id)}
      onClick={e => { e.stopPropagation(); onClick(node.id); }}
    >
      <div
        className="rounded-lg p-3 transition-all"
        style={{
          background: colors.bg,
          border: `2px solid ${isSelected ? colors.border : isConnectTarget ? '#d4af37' : colors.border + '40'}`,
          boxShadow: isSelected
            ? `0 0 20px ${colors.border}30, 0 4px 15px rgba(0,0,0,0.4)`
            : '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: colors.text }}>
            {node.type}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(node.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 text-xs"
          >
            ×
          </button>
        </div>
        <div className="text-xs font-bold mb-1" style={{ color: '#e8dcc8' }}>
          {node.label}
        </div>
        <div className="text-[10px] leading-relaxed" style={{ color: '#8b7355' }}>
          {node.content.substring(0, 60)}{node.content.length > 60 ? '...' : ''}
        </div>
      </div>
    </div>
  );
});

export const EvidenceBoard: React.FC = () => {
  const [nodes, setNodes] = useState<EvidenceNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<EvidenceConnection[]>(INITIAL_CONNECTIONS);
  const [dragState, setDragState] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState<{ from: string } | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newNode, setNewNode] = useState({ label: '', type: 'evidence' as EvidenceNode['type'], content: '' });
  const boardRef = useRef<HTMLDivElement>(null);

  // ⚡ Bolt Optimization: Use a Map for O(1) node lookups instead of O(N) array search.
  // This drastically reduces complexity during high-frequency events (like drag re-renders)
  // from O(Nodes * Connections) to O(Nodes + Connections) by replacing nodes.find().
  const nodeMap = useMemo(() => {
    const map = new Map<string, EvidenceNode>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodeMap.get(nodeId);
    if (!node || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    setDragState({
      nodeId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    });
    setSelectedNode(nodeId);
  }, [nodeMap]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - NODE_WIDTH, e.clientX - rect.left - dragState.offsetX));
    const y = Math.max(0, Math.min(rect.height - NODE_HEIGHT, e.clientY - rect.top - dragState.offsetY));

    setNodes(prev => prev.map(n =>
      n.id === dragState.nodeId ? { ...n, x, y } : n
    ));
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (connectMode) {
      if (connectMode.from !== nodeId) {
        const newConn: EvidenceConnection = {
          id: `c-${Date.now()}`,
          from: connectMode.from,
          to: nodeId,
          label: 'relates to',
          strength: 'moderate',
        };
        setConnections(prev => [...prev, newConn]);
      }
      setConnectMode(null);
    } else {
      setSelectedNode(nodeId);
    }
  }, [connectMode]);

  const addNode = () => {
    if (!newNode.label.trim()) return;
    const boardRect = boardRef.current?.getBoundingClientRect();
    const node: EvidenceNode = {
      id: `n-${Date.now()}`,
      label: newNode.label,
      type: newNode.type,
      content: newNode.content || newNode.label,
      x: NODE_MARGIN + Math.random() * ((boardRect?.width || 600) - NODE_WIDTH - NODE_MARGIN * 2),
      y: NODE_MARGIN + Math.random() * ((boardRect?.height || 400) - NODE_HEIGHT - NODE_MARGIN * 2),
    };
    setNodes(prev => [...prev, node]);
    setNewNode({ label: '', type: 'evidence', content: '' });
    setShowAddPanel(false);
  };

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  }, [selectedNode]);

  const deleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
  };

  const getStrengthStyle = (strength: EvidenceConnection['strength']) => {
    switch (strength) {
      case 'strong': return { strokeWidth: 2.5, dashArray: '' };
      case 'moderate': return { strokeWidth: 1.5, dashArray: '6,3' };
      case 'weak': return { strokeWidth: 1, dashArray: '3,6' };
    }
  };

  return (
    <div data-testid="view-evidence-board" className="h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a0f0a 0%, #0d0806 100%)' }}>
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: '#3d2b1f' }}>
        <div>
          <h2 data-testid="heading-evidence-board" className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Merriweather, serif', color: '#d4af37' }}>
            🔗 Evidence Board
          </h2>
          <p className="text-xs mt-1 tracking-wider" style={{ color: '#8b7355' }}>
            Connect the dots. Build your case. Drag nodes, draw connections.
          </p>
        </div>
        <div className="flex gap-2">
          {connectMode ? (
            <button
              onClick={() => setConnectMode(null)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded"
              style={{ background: '#dc2626', color: 'white' }}
            >
              ✕ Cancel Link
            </button>
          ) : (
            <button
              onClick={() => {
                if (selectedNode) setConnectMode({ from: selectedNode });
              }}
              disabled={!selectedNode}
              className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all disabled:opacity-30"
              style={{ background: '#2563eb', color: 'white' }}
            >
              🔗 Link From Selected
            </button>
          )}
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded"
            style={{ background: '#d4af37', color: '#1a0f0a' }}
          >
            + Add Node
          </button>
        </div>
      </div>

      {/* Add Panel */}
      {showAddPanel && (
        <div className="px-6 py-4 border-b flex gap-3 items-end" style={{ borderColor: '#3d2b1f', background: '#150d08' }}>
          <select
            value={newNode.type}
            onChange={e => setNewNode(prev => ({ ...prev, type: e.target.value as EvidenceNode['type'] }))}
            className="px-3 py-2 text-xs rounded outline-none"
            style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#d4af37' }}
          >
            {Object.keys(NODE_COLORS).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            value={newNode.label}
            onChange={e => setNewNode(prev => ({ ...prev, label: e.target.value }))}
            placeholder="Node label..."
            className="flex-1 px-3 py-2 text-xs rounded outline-none"
            style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
            onKeyDown={e => e.key === 'Enter' && addNode()}
          />
          <input
            value={newNode.content}
            onChange={e => setNewNode(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Details..."
            className="flex-1 px-3 py-2 text-xs rounded outline-none"
            style={{ background: '#2a1c12', border: '1px solid #3d2b1f', color: '#e8dcc8' }}
          />
          <button onClick={addNode} className="px-4 py-2 text-xs font-bold rounded" style={{ background: '#d4af37', color: '#1a0f0a' }}>
            Add
          </button>
        </div>
      )}

      {/* Board Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={boardRef}
          className="w-full h-full relative cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => { if (!dragState) setSelectedNode(null); }}
          style={{
            backgroundImage: `
              radial-gradient(circle at 20px 20px, rgba(212,175,55,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        >
          {/* SVG Connections Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map(conn => {
              const from = getNodeCenter(conn.from);
              const to = getNodeCenter(conn.to);
              const style = getStrengthStyle(conn.strength);
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              return (
                <g key={conn.id}>
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke="#d4af37"
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.dashArray}
                    opacity={0.4}
                  />
                  {conn.label && (
                    <text
                      x={midX} y={midY - 8}
                      fill="#8b7355"
                      fontSize="9"
                      textAnchor="middle"
                      className="uppercase"
                      style={{ letterSpacing: '0.1em', pointerEvents: 'auto', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes Layer */}
          {nodes.map(node => (
            <MemoizedNode
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              isConnectTarget={!!(connectMode && connectMode.from !== node.id)}
              isDragging={dragState?.nodeId === node.id}
              colors={NODE_COLORS[node.type]}
              onMouseDown={handleMouseDown}
              onClick={handleNodeClick}
              onDelete={deleteNode}
            />
          ))}

          {/* Connect Mode Indicator */}
          {connectMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{ background: '#2563eb', color: 'white', boxShadow: '0 0 20px rgba(37,99,235,0.3)' }}>
              Click a node to connect
            </div>
          )}
        </div>
      </div>

      {/* Selected Node Detail */}
      {selectedNode && (() => {
        const node = nodeMap.get(selectedNode);
        if (!node) return null;
        const colors = NODE_COLORS[node.type];
        const nodeConnections = connections.filter(c => c.from === node.id || c.to === node.id);
        return (
          <div className="px-6 py-4 border-t" style={{ borderColor: '#3d2b1f', background: '#150d08' }}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: colors.text }}>
                  {node.type}
                </span>
                <h3 className="text-sm font-bold mt-1" style={{ fontFamily: 'Merriweather, serif', color: '#e8dcc8' }}>
                  {node.label}
                </h3>
                <p className="text-xs mt-1" style={{ color: '#8b7355' }}>{node.content}</p>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-widest" style={{ color: '#5a4030' }}>
                  {nodeConnections.length} connection{nodeConnections.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
