/**
 * Agent List Skeleton Component
 *
 * Loading skeleton for the agent list while data is being fetched.
 * Provides visual feedback during loading states.
 */

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface AgentListSkeletonProps {
  count?: number
  variant?: 'grid' | 'list'
}

export function AgentListSkeleton({ count = 6, variant = 'grid' }: AgentListSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className='space-y-3'>
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className='animate-pulse'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <Skeleton className='h-10 w-10 rounded-full' />

                  <div className='flex-1 space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <Skeleton className='h-5 w-32' />
                      <Skeleton className='h-5 w-16' />
                    </div>
                    <Skeleton className='h-4 w-48' />
                    <div className='flex items-center space-x-4'>
                      <Skeleton className='h-3 w-20' />
                      <Skeleton className='h-3 w-20' />
                      <Skeleton className='h-3 w-24' />
                    </div>
                  </div>
                </div>

                <div className='flex items-center space-x-2'>
                  <Skeleton className='h-8 w-8' />
                  <Skeleton className='h-8 w-20' />
                  <Skeleton className='h-8 w-8' />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className='animate-pulse'>
          <CardHeader className='pb-2'>
            <div className='flex items-start justify-between'>
              <div className='flex items-center space-x-3'>
                <Skeleton className='h-10 w-10 rounded-full' />

                <div className='space-y-1'>
                  <Skeleton className='h-5 w-24' />
                  <Skeleton className='h-4 w-16' />
                </div>
              </div>

              <Skeleton className='h-8 w-8' />
            </div>
          </CardHeader>

          <CardContent className='py-2'>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
            </div>

            <div className='mt-3 flex items-center space-x-4'>
              <Skeleton className='h-3 w-12' />
              <Skeleton className='h-3 w-12' />
              <Skeleton className='h-3 w-12' />
            </div>
          </CardContent>

          <CardFooter className='pt-2 pb-4'>
            <div className='flex w-full space-x-2'>
              <Skeleton className='h-8 flex-1' />
              <Skeleton className='h-8 w-8' />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
