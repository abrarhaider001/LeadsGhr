import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-[#DFD9EC] bg-[#ECE9FA] text-[#190B2D]',
        secondary: 'border-[#DFD9EC] bg-white text-[#190B2D]',
        outline: 'border-[#DFD9EC] bg-transparent text-[#190B2D]',
        accent: 'border-[#5B12C9] bg-[#5B12C9] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
