/**
 * Sim Chat Widget - Main component for integrating Parlant chat with Sim's architecture
 *
 * This component provides a complete chat widget integration with:
 * - Proper TypeScript typing
 * - Sim design system integration
 * - Workspace isolation
 * - Configuration management
 * - Error handling and logging
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, MessageCircle, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import {
  createThemeCSS,
  generateTailwindClasses,
  getPositionStyles,
  getSizeStyles,
  mergeWithDefaults,
  validateWidgetConfig,
} from '../config/widget-config'
import type {
  ChatWidgetError,
  SimChatWidgetProps,
  SimChatWidgetState,
} from '../types/parlant-widget.types'

// Dynamic import of ParlantChatbox with fallback for build issues
const ParlantChatbox = dynamic(
  () => {
    return import('parlant-chat-react').catch(() => {
      // Fallback component if parlant-chat-react fails to load
      console.warn('Failed to load parlant-chat-react, using fallback component')
      return {
        default: () => (
          <div className='fixed right-4 bottom-4 max-w-md rounded-lg border bg-muted p-4'>
            <p className='text-muted-foreground text-sm'>
              Chat widget is temporarily unavailable. Please try refreshing the page.
            </p>
          </div>
        ),
      }
    })
  },
  {
    ssr: false,
    loading: () => <ChatLoadingSpinner />,
  }
)

const logger = createLogger('SimChatWidget')

/**
 * Main Sim Chat Widget Component
 */
export function SimChatWidget({
  config: userConfig,
  initialState,
  className,
  containerClassName,
  ...parlantProps
}: SimChatWidgetProps) {
  // Merge user config with defaults
  const config = useMemo(() => mergeWithDefaults(userConfig), [userConfig])

  // Validate configuration
  const validation = useMemo(() => validateWidgetConfig(config), [config])

  // Widget state management
  const [state, setState] = useState<SimChatWidgetState>({
    isOpen: false,
    isMinimized: false,
    connectionStatus: 'disconnected',
    messages: [],
    isTyping: false,
    hasUnreadMessages: false,
    unreadCount: 0,
    ...initialState,
  })

  // Error state
  const [error, setError] = useState<{
    type: ChatWidgetError
    message: string
    details?: any
  } | null>(null)

  // Generate dynamic styles and classes
  const tailwindClasses = useMemo(() => generateTailwindClasses(config), [config])
  const positionStyles = useMemo(() => getPositionStyles(config.position), [config.position])
  const sizeStyles = useMemo(() => getSizeStyles(config.size), [config.size])
  const themeCSS = useMemo(() => createThemeCSS(config), [config])

  // Event handlers
  const handleChatOpen = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true, hasUnreadMessages: false, unreadCount: 0 }))
    config.onChatOpen?.()
    logger.info('Chat widget opened', { workspaceId: config.workspaceId })
  }, [config])

  const handleChatClose = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    config.onChatClose?.()
    logger.info('Chat widget closed', { workspaceId: config.workspaceId })
  }, [config])

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setState((prev) => ({ ...prev, currentSessionId: sessionId, connectionStatus: 'connected' }))
      config.onSessionStart?.(sessionId)
      logger.info('Chat session created', { sessionId, workspaceId: config.workspaceId })
    },
    [config]
  )

  const handleError = useCallback(
    (error: Error) => {
      const chatError = {
        type: 'UNKNOWN_ERROR' as ChatWidgetError,
        message: error.message,
        details: error.stack,
      }

      setError(chatError)
      setState((prev) => ({ ...prev, connectionStatus: 'error' }))
      config.onError?.(error)
      logger.error('Chat widget error', { error: chatError, workspaceId: config.workspaceId })
    },
    [config]
  )

  // Inject custom CSS
  useEffect(() => {
    if (!themeCSS) return

    const styleElement = document.createElement('style')
    styleElement.id = `parlant-theme-${config.workspaceId}`
    styleElement.textContent = themeCSS
    document.head.appendChild(styleElement)

    return () => {
      const existingStyle = document.getElementById(`parlant-theme-${config.workspaceId}`)
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [themeCSS, config.workspaceId])

  // Handle connection status updates
  useEffect(() => {
    if (state.isOpen && state.connectionStatus === 'disconnected') {
      setState((prev) => ({ ...prev, connectionStatus: 'connecting' }))
    }
  }, [state.isOpen])

  // Custom popup button component
  const PopupButton = useCallback(
    ({ toggleChatOpen }: { toggleChatOpen: () => void }) => (
      <Button
        onClick={() => {
          toggleChatOpen()
          handleChatOpen()
        }}
        className={cn(tailwindClasses.popupButton, containerClassName)}
        style={positionStyles}
        aria-label='Open chat'
      >
        <MessageCircle className={tailwindClasses.popupButtonIcon} />
        {state.unreadCount > 0 && (
          <div className='-top-1 -right-1 absolute flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive font-medium text-destructive-foreground text-xs'>
            {state.unreadCount}
          </div>
        )}
      </Button>
    ),
    [tailwindClasses, containerClassName, positionStyles, state.unreadCount, handleChatOpen]
  )

  // Custom header component
  const Header = useCallback(
    ({
      changeIsExpanded,
      agentName,
    }: {
      changeIsExpanded: () => void
      agentName: string | undefined
    }) => (
      <div className='flex items-center justify-between bg-primary p-4 text-primary-foreground'>
        <div className='flex items-center space-x-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20'>
            <MessageCircle className='h-4 w-4' />
          </div>
          <div>
            <h3 className='font-medium'>{agentName || 'Chat Assistant'}</h3>
            <p className='text-xs opacity-75'>
              {state.connectionStatus === 'connected' && 'Online'}
              {state.connectionStatus === 'connecting' && 'Connecting...'}
              {state.connectionStatus === 'error' && 'Connection Error'}
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => {
            changeIsExpanded()
            handleChatClose()
          }}
          className='text-primary-foreground hover:bg-primary-foreground/20'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>
    ),
    [state.connectionStatus, handleChatClose]
  )

  // Show validation errors
  if (!validation.isValid) {
    return (
      <div className='fixed right-4 bottom-4 max-w-md'>
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            Chat Widget Configuration Error:
            <ul className='mt-2 list-inside list-disc'>
              {validation.errors.map((error, index) => (
                <li key={index} className='text-sm'>
                  {error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show runtime errors
  if (error) {
    return (
      <div className='fixed right-4 bottom-4 max-w-md'>
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            <div className='space-y-2'>
              <p className='font-medium'>Chat Error</p>
              <p className='text-sm'>{error.message}</p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setError(null)
                  setState((prev) => ({ ...prev, connectionStatus: 'disconnected' }))
                }}
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const parlantPropsWithDefaults = {
    server: config.parlantServerUrl,
    agentId: config.agentId,
    agentName: config.agentName,
    chatDescription: config.branding?.welcomeMessage,
    float: true,
    classNames: tailwindClasses,
    components: {
      popupButton: PopupButton,
      header: Header,
    },
    onSessionCreated: handleSessionCreated,
    ...parlantProps,
  }

  return (
    <div
      className={cn('parlant-chat-widget', className)}
      style={state.isOpen ? sizeStyles : undefined}
    >
      <ParlantChatbox {...parlantPropsWithDefaults} />
    </div>
  )
}

/**
 * Loading spinner component for dynamic import
 */
function ChatLoadingSpinner() {
  return (
    <div className='fixed right-4 bottom-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-primary'>
      <MessageCircle className='h-6 w-6 animate-pulse text-primary-foreground' />
    </div>
  )
}

export default SimChatWidget
