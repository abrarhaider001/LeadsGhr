import * as React from 'react'
import { cn } from '../../lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[125px] w-full rounded-xl border border-[#DFD9EC] bg-white px-3.5 py-2.5 text-[13px] leading-normal text-[#190B2D] transition-colors placeholder:text-[#675E76] focus-visible:outline-2 focus-visible:outline-[#29CBEA] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-65',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
