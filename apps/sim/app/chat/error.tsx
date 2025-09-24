'use client'

import { useEffect } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { ChatErrorState } from './components/error-state/error-state'

const logger = createLogger('ChatError')

interface ChatErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ChatError({ error, reset }: ChatErrorProps) {
  useEffect(() => {
    logger.error('Chat route error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  const getErrorMessage = () => {
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      return 'You need to be authenticated to access chat features. Please log in and try again.'
    }

    if (error.message.includes('workspace') || error.message.includes('permission')) {
      return 'You do not have permission to access this workspace. Please contact your administrator.'
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to chat services. Please check your connection and try again.'
    }

    return 'An unexpected error occurred while loading the chat. Please try again or contact support if the issue persists.'
  }

  return <ChatErrorState error={getErrorMessage()} starCount='3.2k' />
}
