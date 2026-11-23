import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'la-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--ui-button-radius-lg) text-(length:--ui-button-font-size) font-(--ui-button-font-weight) transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-65 cursor-pointer border min-h-(--ui-control-height-lg) px-(--ui-button-padding-x)',
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground hover:bg-primary-hover hover:border-primary-hover',
        secondary: 'secondary border-border bg-card text-foreground hover:bg-muted',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-muted',
        outline: 'border-border bg-card text-foreground hover:bg-muted',
      },
      size: {
        default: 'min-h-(--ui-control-height-lg) px-(--ui-button-padding-x)',
        sm: 'min-h-(--ui-control-height-sm) px-(--ui-space-3) text-(length:--ui-text-xs)',
        lg: 'min-h-(--ui-control-height-xl) px-(--ui-space-5)',
        icon: 'h-(--ui-control-height-lg) w-(--ui-control-height-lg) px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
