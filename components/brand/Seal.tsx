import React from 'react';

const ScalesPath = () => (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 3v3M6 21h12M8 21V11l4-3 4 3v10M5 11h14"
  />
);

export type SealTone = 'primary' | 'alt';

/** One-tone seal: primary = silver pill / dark scales; alt = dark pill / silver scales. */
export const Seal: React.FC<{
  tone?: SealTone;
  size?: number;
  className?: string;
  title?: string;
}> = ({ tone = 'primary', size = 40, className = '', title }) => {
  const primary = tone === 'primary';
  return (
    <div
      title={title}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(10, size * 0.22),
        display: 'grid',
        placeItems: 'center',
        background: primary ? '#cfd5de' : '#2a2e35',
        border: primary ? 'none' : '1px solid rgba(207,213,222,0.22)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.48}
        height={size * 0.48}
        viewBox="0 0 24 24"
        fill="none"
        stroke={primary ? '#0a0a0c' : '#cfd5de'}
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <ScalesPath />
      </svg>
    </div>
  );
};
