import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-leather-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-logo-dark border border-mahogany-800 text-gold-500 hover:bg-gold-gradient hover:text-leather-950 hover:border-gold-500 hover:shadow-gold-soft',
        ghost:
          'bg-transparent text-leather-300 hover:text-gold-500 hover:bg-mahogany-900/40',
        gold:
          'bg-gold-lit border border-gold-500 text-leather-950 shadow-gold-glow',
      },
      size: {
        sm: 'w-7 h-7',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, label, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';
