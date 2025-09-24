'use client'

import { useEffect } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('WorkspaceChatError')

interface WorkspaceChatErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function WorkspaceChatError({ error, reset }: WorkspaceChatErrorProps) {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string

  useEffect(() => {
    logger.error('Workspace chat error:', {
      workspaceId,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error, workspaceId])

  const getErrorMessage = () => {
    if (error.message.includes('403') || error.message.includes('permission')) {
      return 'You do not have permission to access chat in this workspace.'
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'This workspace could not be found or has been deleted.'
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to chat services. Please check your connection.'
    }

    return 'An error occurred while loading the chat interface.'
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='mx-4 w-full max-w-md'>
        <div className='rounded-lg bg-white p-6 shadow-md'>
          <div className='mb-4 flex items-center justify-center'>
            <div className='rounded-full bg-red-100 p-3'>
              <AlertTriangle className='h-8 w-8 text-red-600' />
            </div>
          </div>

          <h1 className='mb-2 text-center font-semibold text-gray-900 text-xl'>Chat Unavailable</h1>

          <p className='mb-6 text-center text-gray-600 text-sm'>{getErrorMessage()}</p>

          <div className='space-y-3'>
            <Button onClick={reset} className='w-full' variant='default'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Try Again
            </Button>

            <Button
              onClick={() => router.push(`/workspace/${workspaceId}/w`)}
              variant='outline'
              className='w-full'
            >
              <Home className='mr-2 h-4 w-4' />
              Return to Workspace
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
