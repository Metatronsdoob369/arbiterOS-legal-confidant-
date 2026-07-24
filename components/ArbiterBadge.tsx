import React from 'react';
import { Seal } from './brand/Seal';

/** Compact brand lockup for counsel header. */
export const ArbiterBadge: React.FC = () => (
  <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{
    border: '1px solid rgba(207,213,222,0.22)',
    background: 'linear-gradient(180deg, #2a2e35 0%, #1c2026 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.35)',
  }}>
    <Seal tone="primary" size={36} />
    <div className="flex flex-col leading-tight">
      <span
        className="text-[11px] font-bold uppercase"
        style={{ letterSpacing: '0.16em', color: '#cfd5de' }}
      >
        Arbiter
      </span>
      <span
        className="text-[8px] font-medium uppercase"
        style={{ letterSpacing: '0.2em', color: '#c4a574' }}
      >
        Legal Confidant
      </span>
    </div>
  </div>
);
