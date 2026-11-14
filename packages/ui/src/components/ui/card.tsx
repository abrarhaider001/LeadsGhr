import * as React from 'react'
import { cn } from '../../lib/utils'

const Card = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <section
      ref={ref}
      className={cn('la-card rounded-[18px] border border-[#DFD9EC] bg-white p-6 text-[#190B2D]', className)}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('la-card-heading flex flex-col gap-1.5', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('m-0 text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('m-0 text-sm text-[#675E76]', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('pt-0', className)} {...props} />,
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
