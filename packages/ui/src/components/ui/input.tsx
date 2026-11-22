import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex min-h-(--ui-field-height) w-full rounded-(--ui-field-radius-lg) border border-border bg-card px-(--ui-field-padding-x) py-0 text-(length:--ui-field-font-size) text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-65',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
