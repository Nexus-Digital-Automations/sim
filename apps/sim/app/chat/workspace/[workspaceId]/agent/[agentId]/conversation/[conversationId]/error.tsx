'use client'

import { useEffect } from 'react'
import { AlertTriangle, ArrowLeft, MessageCircle, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ConversationChatError')

interface ConversationChatErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ConversationChatError({ error, reset }: ConversationChatErrorProps) {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const agentId = params.agentId as string
  const conversationId = params.conversationId as string

  useEffect(() => {
    logger.error('Conversation chat error:', {
      workspaceId,
      agentId,
      conversationId,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error, workspaceId, agentId, conversationId])

  const getErrorMessage = () => {
    if (error.message.includes('403') || error.message.includes('permission')) {
      return 'You do not have permission to access this conversation.'
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'This conversation could not be found or has been deleted.'
    }

    if (error.message.includes('archived')) {
      return 'This conversation has been archived and is no longer accessible.'
    }

    if (error.message.includes('parlant') || error.message.includes('chat service')) {
      return 'Chat service is temporarily unavailable. Please try again in a moment.'
    }

    return 'An error occurred while loading this conversation.'
  }

  return (
    <div className='flex h-screen flex-col bg-gray-50'>
      {/* Header */}
      <div className='flex-shrink-0 border-b bg-white'>
        <div className='mx-auto max-w-4xl px-4 py-4'>
          <div className='flex items-center space-x-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => router.push(`/chat/workspace/${workspaceId}/agent/${agentId}`)}
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <div className='flex items-center space-x-2'>
              <MessageCircle className='h-5 w-5 text-gray-400' />
              <span className='text-gray-500 text-sm'>Conversation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error content */}
      <div className='flex flex-1 items-center justify-center px-4'>
        <div className='max-w-md text-center'>
          <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
            <AlertTriangle className='h-8 w-8 text-red-600' />
          </div>

          <h1 className='mb-3 font-semibold text-2xl text-gray-900'>Conversation Unavailable</h1>

          <p className='mb-8 text-gray-600'>{getErrorMessage()}</p>

          <div className='flex flex-col justify-center gap-3 sm:flex-row'>
            <Button onClick={reset} className='min-w-[120px]'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Try Again
            </Button>

            <Button
              variant='outline'
              onClick={() => router.push(`/chat/workspace/${workspaceId}/agent/${agentId}`)}
              className='min-w-[120px]'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
