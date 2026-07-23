import React from 'react';

/**
 * NightModeOverlay — reading-lamp glow (effect, not a full theme).
 * Soft champagne / silver wash over the gunmetal shell.
 */
export const NightModeOverlay: React.FC = () => (
  <div
    data-testid="night-mode-overlay"
    className="fixed inset-0 pointer-events-none z-[100]"
    style={{
      background:
        'radial-gradient(ellipse 600px 400px at 50% 30%, rgba(207,213,222,0.07) 0%, rgba(196,165,116,0.04) 40%, transparent 70%)',
    }}
  >
    <div
      className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-[60px]"
      style={{
        background: 'linear-gradient(180deg, #cfd5de, #c4a574, transparent)',
        boxShadow: '0 0 8px rgba(207,213,222,0.35)',
      }}
    />
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[58px] w-[8px] h-[8px] rounded-full"
      style={{
        background: '#cfd5de',
        boxShadow:
          '0 0 15px rgba(207,213,222,0.5), 0 0 28px rgba(196,165,116,0.25)',
      }}
    />
  </div>
);

NightModeOverlay.displayName = 'NightModeOverlay';
