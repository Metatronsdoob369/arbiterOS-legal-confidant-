import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  // Metal as border — gunmetal fill, silver rim
  'inline-flex items-center justify-center gap-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-silver focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gunmetal text-silver-bright border border-silver hover:bg-gunmetal-lit hover:border-silver-bright active:scale-[0.98]',
        ghost:
          'bg-transparent text-silver-den border border-transparent hover:border-silver/25 hover:text-silver hover:bg-gunmetal/40',
        outline:
          'bg-transparent text-silver border border-silver/60 hover:bg-silver/10 hover:border-silver active:scale-[0.98]',
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
