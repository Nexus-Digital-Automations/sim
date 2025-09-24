'use client'

import { useEffect } from 'react'
import { AlertTriangle, ArrowLeft, MessageCircle, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('AgentChatError')

interface AgentChatErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AgentChatError({ error, reset }: AgentChatErrorProps) {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const agentId = params.agentId as string

  useEffect(() => {
    logger.error('Agent chat error:', {
      workspaceId,
      agentId,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error, workspaceId, agentId])

  const getErrorMessage = () => {
    if (error.message.includes('403') || error.message.includes('permission')) {
      return 'You do not have permission to chat with this agent.'
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'This agent could not be found or is no longer available.'
    }

    if (error.message.includes('inactive') || error.message.includes('disabled')) {
      return 'This agent is currently inactive or has been disabled.'
    }

    if (error.message.includes('parlant') || error.message.includes('chat service')) {
      return 'Chat service is temporarily unavailable. Please try again in a moment.'
    }

    return 'An error occurred while connecting to the chat agent.'
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='border-b bg-white'>
        <div className='mx-auto max-w-4xl px-4 py-4'>
          <div className='flex items-center space-x-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => router.push(`/chat/workspace/${workspaceId}`)}
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <div className='flex items-center space-x-2'>
              <MessageCircle className='h-5 w-5 text-gray-400' />
              <span className='text-gray-500 text-sm'>Agent Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error content */}
      <div className='mx-auto max-w-2xl px-4 py-16'>
        <div className='text-center'>
          <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
            <AlertTriangle className='h-8 w-8 text-red-600' />
          </div>

          <h1 className='mb-3 font-semibold text-2xl text-gray-900'>Unable to Load Chat</h1>

          <p className='mx-auto mb-8 max-w-md text-gray-600'>{getErrorMessage()}</p>

          <div className='flex flex-col justify-center gap-3 sm:flex-row'>
            <Button onClick={reset} className='min-w-[120px]'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Try Again
            </Button>

            <Button
              variant='outline'
              onClick={() => router.push(`/chat/workspace/${workspaceId}`)}
              className='min-w-[120px]'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Agents
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
