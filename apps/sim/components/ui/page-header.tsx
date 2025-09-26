import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description: string
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0',
        className
      )}
      {...props}
    >
      <div className='space-y-1'>
        <h1 className='font-semibold text-3xl leading-none tracking-tight'>{title}</h1>
        <p className='text-muted-foreground'>{description}</p>
      </div>
      {children && <div className='flex items-center space-x-2'>{children}</div>}
    </div>
  )
)
PageHeader.displayName = 'PageHeader'

export { PageHeader }
