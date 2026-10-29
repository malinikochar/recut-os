import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium tracking-tight',
  {
    variants: {
      variant: {
        default: 'border-[#29B49B]/40 bg-[#29B49B]/15 text-[#5CE1C9]',
        neutral: 'border-[#394950] bg-[#232E33] text-[#F2F0E9]',
        muted: 'border-[#2A363C] bg-[#141B1F] text-[#A9B4B4]',
        amber: 'border-[#E8AA65]/45 bg-[#E8AA65]/15 text-[#F0C28D]',
        error: 'border-[#E05A5A]/50 bg-[#E05A5A]/15 text-[#FF9999]',
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
