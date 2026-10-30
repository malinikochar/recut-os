import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium tracking-tight',
  {
    variants: {
      variant: {
        default: 'border-accent-border bg-accent-soft text-accent-text',
        neutral: 'border-border-strong bg-bg-elevated text-fg',
        muted: 'border-border-subtle bg-bg-subtle text-fg-muted',
        amber: 'border-amber-border bg-amber-soft text-amber-text',
        error: 'border-danger-border bg-danger-soft text-danger-text',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
