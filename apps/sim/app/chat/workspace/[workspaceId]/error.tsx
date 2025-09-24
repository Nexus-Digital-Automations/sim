'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Chat Unavailable
          </h1>

          <p className="text-sm text-gray-600 text-center mb-6">
            {getErrorMessage()}
          </p>

          <div className="space-y-3">
            <Button
              onClick={reset}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={() => router.push(`/workspace/${workspaceId}/w`)}
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Workspace
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}