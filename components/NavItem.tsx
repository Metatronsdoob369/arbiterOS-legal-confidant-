import React from 'react';
import { cn } from './ui/cn';

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  'data-testid'?: string;
}

/** Sidebar nav — gunmetal / silver active rim. */
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
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-silver focus-visible:ring-offset-1 focus-visible:ring-offset-ink',
      active
        ? 'text-silver-bright font-bold border border-silver/70 bg-gunmetal-lit/80'
        : 'text-silver-den border border-transparent hover:text-silver hover:border-silver/25 hover:bg-gunmetal/50',
      className,
    )}
    style={
      active
        ? {
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 18px rgba(207,213,222,0.08)',
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
