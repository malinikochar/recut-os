import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-fg font-semibold hover:bg-accent-hover shadow-xs active:translate-y-px',
        secondary:
          'bg-bg-elevated text-fg border border-border-strong hover:bg-bg-elevated-hover',
        outline:
          'border border-border-strong bg-bg-card/80 text-fg hover:border-accent-border hover:bg-bg-elevated',
        ghost: 'text-fg-muted hover:bg-bg-elevated hover:text-fg',
        amber:
          'bg-amber-soft text-amber-text border border-amber-border hover:bg-amber-soft-hover font-semibold',
        destructive:
          'bg-danger-soft text-danger-text border border-danger-border hover:bg-danger-soft-hover font-medium',
        shell:
          'border border-white/15 bg-white/10 text-white hover:bg-white/18 hover:border-white/25',
        shellGhost:
          'text-white/75 hover:bg-white/10 hover:text-white rounded-lg',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-sm font-semibold',
        icon: 'h-9 w-9 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
