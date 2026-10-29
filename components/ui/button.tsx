import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29B49B]',
  {
    variants: {
      variant: {
        default:
          'bg-[#29B49B] text-[#0B1013] font-semibold hover:bg-[#229A84] shadow-sm',
        secondary:
          'bg-[#232E33] text-[#F2F0E9] border border-[#394950] hover:bg-[#2B3940]',
        outline:
          'border border-[#394950] bg-transparent text-[#F2F0E9] hover:bg-[#1C2529]',
        ghost: 'text-[#A9B4B4] hover:bg-[#1C2529] hover:text-[#F2F0E9]',
        amber:
          'bg-[#E8AA65]/15 text-[#E8AA65] border border-[#E8AA65]/40 hover:bg-[#E8AA65]/25',
        destructive:
          'bg-[#E05A5A]/15 text-[#F48FB1] border border-[#E05A5A]/45 text-[#FF8A8A] hover:bg-[#E05A5A]/25',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-base',
        icon: 'h-9 w-9',
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
