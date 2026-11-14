import * as React from 'react'
import { cn } from '../../lib/utils'

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-[13px] font-semibold leading-none text-[#190B2D] peer-disabled:cursor-not-allowed peer-disabled:opacity-65', className)}
      {...props}
    />
  ),
)
Label.displayName = 'Label'

export { Label }
