import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  // Base classes shared by all variants
  'inline-flex items-center justify-center gap-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-leather-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gold-gradient text-leather-950 border border-gold-500 shadow-gold-soft hover:shadow-gold-glow active:scale-[0.98]',
        ghost:
          'bg-transparent text-leather-300 border border-transparent hover:border-mahogany-800 hover:text-gold-500 hover:bg-mahogany-900/40',
        outline:
          'bg-transparent text-gold-500 border border-gold-600 hover:bg-gold-500/10 hover:shadow-gold-soft active:scale-[0.98]',
        destructive:
          'bg-red-900/40 text-red-300 border border-red-800 hover:bg-red-900/60',
      },
      size: {
        sm: 'h-7 px-3 text-[10px]',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
