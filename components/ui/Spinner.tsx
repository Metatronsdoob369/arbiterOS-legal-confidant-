import React from 'react';
import { cn } from './cn';

interface SpinnerProps extends React.SVGAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, ...props }) => (
  <svg
    className={cn('animate-spin text-silver', sizeMap[size], className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...props}
  >
    <circle
      className="opacity-25"
      cx="12" cy="12" r="10"
      stroke="currentColor" strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);
Spinner.displayName = 'Spinner';

// ── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded bg-gunmetal/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-silver/10 before:to-transparent before:[animation:shimmer_1.5s_infinite]',
      className,
    )}
    {...props}
  />
);
Skeleton.displayName = 'Skeleton';
