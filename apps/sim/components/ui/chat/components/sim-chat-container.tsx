/**
 * Sim Chat Container - Complete chat widget integration for Sim
 *
 * This component provides a complete, ready-to-use chat widget that combines:
 * - SimChatProvider for state management
 * - SimChatWidget for UI rendering
 * - Automatic workspace integration
 * - Error boundaries and logging
 */

'use client'

import React, { ErrorBoundary } from 'react'
import { AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react'

import { createLogger } from '@/lib/logs/console/logger'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { SimChatProvider } from '../providers/sim-chat-provider'
import { SimChatWidget } from './sim-chat-widget'
import {
  SimChatWidgetConfig,
  SimChatWidgetProps,
} from '../types/parlant-widget.types'
import { getEnvironmentConfig } from '../config/widget-config'

const logger = createLogger('SimChatContainer')

interface SimChatContainerProps extends Omit<SimChatWidgetProps, 'config'> {
  /**
   * Workspace ID for chat isolation
   */
  workspaceId: string

  /**
   * Agent ID to connect to
   */
  agentId: string

  /**
   * Optional user ID for personalization
   */
  userId?: string

  /**
   * Custom configuration overrides
   */
  configOverrides?: Partial<SimChatWidgetConfig>

  /**
   * Whether to show debug information in development
   */
  debug?: boolean
}

/**
 * Complete Sim Chat Container with provider and error handling
 */
export function SimChatContainer({
  workspaceId,
  agentId,
  userId,
  configOverrides = {},
  debug = false,
  ...widgetProps
}: SimChatContainerProps) {
  // Build configuration
  const defaultConfig: SimChatWidgetConfig = {
    workspaceId,
    agentId,
    userId,
    ...getEnvironmentConfig(),
    ...configOverrides,
  }

  return (
    <ChatErrorBoundary>
      <SimChatProvider defaultConfig={defaultConfig}>
        <SimChatWidget
          config={defaultConfig}
          {...widgetProps}
        />
        {debug && process.env.NODE_ENV === 'development' && (
          <ChatDebugPanel workspaceId={workspaceId} agentId={agentId} />
        )}
      </SimChatProvider>
    </ChatErrorBoundary>
  )
}

/**
 * Error Boundary for Chat Widget
 */
class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Chat widget error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return <ChatErrorFallback onRetry={() => this.setState({ hasError: false })} />
    }

    return this.props.children
  }
}

/**
 * Fallback UI for chat errors
 */
function ChatErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 max-w-md">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <p className="font-medium">Chat Widget Error</p>
              <p className="text-sm mt-1">
                The chat widget encountered an unexpected error. Please try again.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

/**
 * Debug panel for development
 */
function ChatDebugPanel({ workspaceId, agentId }: {
  workspaceId: string
  agentId: string
}) {
  return (
    <div className="fixed bottom-20 right-4 bg-background border border-border rounded-lg p-3 text-xs font-mono shadow-lg max-w-sm">
      <div className="flex items-center space-x-2 mb-2">
        <MessageCircle className="w-3 h-3" />
        <span className="font-semibold">Chat Debug</span>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <div>Workspace: {workspaceId}</div>
        <div>Agent: {agentId}</div>
        <div>Environment: {process.env.NODE_ENV}</div>
        <div>Server: {process.env.NEXT_PUBLIC_PARLANT_SERVER_URL || 'localhost:8000'}</div>
      </div>
    </div>
  )
}

/**
 * Simple Chat Widget - Minimal configuration required
 */
export function SimpleSimChat({
  workspaceId,
  agentId,
  ...props
}: {
  workspaceId: string
  agentId: string
} & Partial<SimChatContainerProps>) {
  return (
    <SimChatContainer
      workspaceId={workspaceId}
      agentId={agentId}
      {...props}
    />
  )
}

/**
 * Floating Chat Button - Just the popup button, no chat interface
 */
export function SimChatButton({
  workspaceId,
  agentId,
  onClick,
  className,
  ...props
}: {
  workspaceId: string
  agentId: string
  onClick?: () => void
  className?: string
} & Partial<SimChatContainerProps>) {
  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg ${className}`}
      {...props}
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  )
}

export default SimChatContainer