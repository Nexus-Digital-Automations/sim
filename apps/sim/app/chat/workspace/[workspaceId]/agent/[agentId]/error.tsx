'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft, MessageCircle } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/chat/workspace/${workspaceId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Agent Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error content */}
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="mx-auto mb-6 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Unable to Load Chat
          </h1>

          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {getErrorMessage()}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="min-w-[120px]">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/chat/workspace/${workspaceId}`)}
              className="min-w-[120px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}