import React from 'react';

/**
 * NightModeOverlay
 *
 * A fixed, pointer-events-none overlay that simulates a warm reading-lamp
 * glow. This is intentionally NOT a full light/dark theme switch — it is a
 * unique aesthetic effect that overlays the existing dark app shell.
 *
 * Rendered only when nightMode === true. Toggle is driven by NightModeContext.
 */
export const NightModeOverlay: React.FC = () => (
  <div
    data-testid="night-mode-overlay"
    className="fixed inset-0 pointer-events-none z-[100]"
    style={{
      background:
        'radial-gradient(ellipse 600px 400px at 50% 30%, rgba(255,200,100,0.08) 0%, rgba(255,180,80,0.03) 40%, transparent 70%)',
    }}
  >
    {/* Gold lamp string */}
    <div
      className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-[60px]"
      style={{
        background: 'linear-gradient(180deg, #d4af37, #b8941e, transparent)',
        boxShadow: '0 0 8px rgba(212,175,55,0.4)',
      }}
    />
    {/* Lamp pull knob */}
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[58px] w-[8px] h-[8px] rounded-full"
      style={{
        background: '#d4af37',
        boxShadow:
          '0 0 15px rgba(212,175,55,0.6), 0 0 30px rgba(255,200,100,0.3)',
      }}
    />
  </div>
);

NightModeOverlay.displayName = 'NightModeOverlay';
