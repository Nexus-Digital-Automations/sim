import { Skeleton } from '@/components/ui/skeleton'

export default function WorkspaceChatLoading() {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header skeleton */}
      <div className='border-b bg-white'>
        <div className='mx-auto max-w-4xl px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <div className='space-y-1'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-20' />
              </div>
            </div>
            <Skeleton className='h-8 w-24 rounded-md' />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className='rounded-lg border bg-white p-6 shadow-sm'>
              <div className='mb-4 flex items-center space-x-3'>
                <Skeleton className='h-10 w-10 rounded-full' />
                <div className='flex-1 space-y-1'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-3 w-32' />
                </div>
              </div>
              <Skeleton className='mb-2 h-3 w-full' />
              <Skeleton className='mb-4 h-3 w-3/4' />
              <Skeleton className='h-8 w-full rounded-md' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
