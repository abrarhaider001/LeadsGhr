import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex min-h-[41px] w-full rounded-xl border border-[#DFD9EC] bg-white px-3.5 py-0 text-[13px] text-[#190B2D] transition-colors placeholder:text-[#675E76] focus-visible:outline-2 focus-visible:outline-[#29CBEA] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-65',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
