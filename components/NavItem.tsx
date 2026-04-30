import React from 'react';
import { cn } from './ui/cn';

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  'data-testid'?: string;
}

/**
 * Sidebar navigation item — mahogany/gold aesthetic.
 * Active state: gold gradient background.
 * Inactive state: muted leather color with hover highlight.
 */
export const NavItem: React.FC<NavItemProps> = ({
  label,
  icon,
  active = false,
  className,
  ...props
}) => (
  <button
    className={cn(
      'w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-150 text-xs font-semibold uppercase tracking-wider',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-1 focus-visible:ring-offset-leather-950',
      active
        ? 'text-leather-950 font-bold border border-gold-500'
        : 'text-leather-500 border border-transparent hover:text-gold-500 hover:border-mahogany-800/60 hover:bg-mahogany-900/40',
      className,
    )}
    style={
      active
        ? {
            background: 'linear-gradient(135deg, #d4af37, #b8941e)',
            boxShadow: '0 0 15px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
          }
        : undefined
    }
    {...props}
  >
    {icon}
    <span className="hidden md:block">{label}</span>
  </button>
);

NavItem.displayName = 'NavItem';
