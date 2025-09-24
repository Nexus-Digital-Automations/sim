import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationChatLoading() {
  return (
    <div className='flex h-screen flex-col bg-gray-50'>
      {/* Header */}
      <div className='flex-shrink-0 border-b bg-white'>
        <div className='mx-auto max-w-4xl px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Button variant='ghost' size='sm' disabled>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div className='flex items-center space-x-2'>
                <MessageCircle className='h-5 w-5 text-gray-400' />
                <Skeleton className='h-4 w-48' />
              </div>
            </div>
            <Skeleton className='h-8 w-24 rounded-md' />
          </div>
        </div>
      </div>

      {/* Chat interface skeleton */}
      <div className='flex flex-1'>
        {/* Main chat area */}
        <div className='flex flex-1 flex-col'>
          {/* Chat messages area */}
          <div className='flex-1 space-y-6 overflow-hidden p-6'>
            {/* Conversation header */}
            <div className='border-b pb-4 text-center'>
              <Skeleton className='mx-auto mb-2 h-6 w-64' />
              <Skeleton className='mx-auto h-4 w-48' />
            </div>

            {/* Message history skeletons */}
            <div className='space-y-6'>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  {i % 2 === 1 && (
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton className='h-8 w-8 rounded-full' />
                    </div>
                  )}
                  <div className={`max-w-[70%] space-y-2 ${i % 2 === 0 ? 'text-right' : ''}`}>
                    <div
                      className={`rounded-lg p-4 ${i % 2 === 0 ? 'bg-blue-100' : 'bg-gray-100'}`}
                    >
                      <Skeleton className='mb-2 h-4 w-full' />
                      <Skeleton className='h-4 w-3/4' />
                      {i % 3 === 0 && <Skeleton className='mt-2 h-4 w-1/2' />}
                    </div>
                    <Skeleton className='h-3 w-16' />
                  </div>
                  {i % 2 === 0 && (
                    <div className='ml-3 flex-shrink-0'>
                      <Skeleton className='h-8 w-8 rounded-full' />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Loading indicator for new message */}
            <div className='flex justify-center'>
              <div className='flex space-x-1'>
                <Skeleton className='h-2 w-2 animate-pulse rounded-full' />
                <Skeleton className='h-2 w-2 animate-pulse rounded-full' />
                <Skeleton className='h-2 w-2 animate-pulse rounded-full' />
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className='border-t bg-white p-4'>
            <div className='mx-auto max-w-4xl'>
              <div className='flex space-x-4'>
                <div className='flex-1'>
                  <Skeleton className='h-12 w-full rounded-md' />
                </div>
                <Skeleton className='h-12 w-12 rounded-md' />
              </div>
              <div className='mt-2 flex items-center justify-between'>
                <Skeleton className='h-3 w-32' />
                <Skeleton className='h-3 w-24' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
