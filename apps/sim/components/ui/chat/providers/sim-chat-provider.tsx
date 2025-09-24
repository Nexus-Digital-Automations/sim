/**
 * Sim Chat Provider - Context provider for managing chat widget state
 *
 * This provider manages the global state for the chat widget including:
 * - Configuration management
 * - Session persistence
 * - Multi-workspace support
 * - Analytics and logging
 * - User preferences
 */

'use client'

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react'

import { createLogger } from '@/lib/logs/console/logger'
import {
  SimChatWidgetConfig,
  SimChatWidgetState,
  SimChatWidgetActions,
  SimChatContextValue,
  SimChatProviderProps,
  MessageInterface,
  ChatAnalyticsEvent,
} from '../types/parlant-widget.types'
import { mergeWithDefaults, getEnvironmentConfig } from '../config/widget-config'

const logger = createLogger('SimChatProvider')

// Action types for state management
type ChatAction =
  | { type: 'SET_CONFIG'; payload: Partial<SimChatWidgetConfig> }
  | { type: 'UPDATE_STATE'; payload: Partial<SimChatWidgetState> }
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'MINIMIZE_CHAT' }
  | { type: 'MAXIMIZE_CHAT' }
  | { type: 'ADD_MESSAGE'; payload: MessageInterface }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'MARK_AS_READ' }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'connecting' | 'disconnected' | 'error' }
  | { type: 'SET_SESSION'; payload: string | undefined }

// Initial state
const initialState: SimChatWidgetState = {
  isOpen: false,
  isMinimized: false,
  connectionStatus: 'disconnected',
  messages: [],
  isTyping: false,
  hasUnreadMessages: false,
  unreadCount: 0,
}

// State reducer
function chatReducer(state: SimChatWidgetState, action: ChatAction): SimChatWidgetState {
  switch (action.type) {
    case 'UPDATE_STATE':
      return { ...state, ...action.payload }

    case 'OPEN_CHAT':
      return {
        ...state,
        isOpen: true,
        isMinimized: false,
        hasUnreadMessages: false,
        unreadCount: 0,
      }

    case 'CLOSE_CHAT':
      return {
        ...state,
        isOpen: false,
      }

    case 'MINIMIZE_CHAT':
      return {
        ...state,
        isMinimized: true,
      }

    case 'MAXIMIZE_CHAT':
      return {
        ...state,
        isMinimized: false,
      }

    case 'ADD_MESSAGE':
      const isUserMessage = action.payload.source === 'user'
      return {
        ...state,
        messages: [...state.messages, action.payload],
        hasUnreadMessages: !state.isOpen && !isUserMessage,
        unreadCount: !state.isOpen && !isUserMessage ? state.unreadCount + 1 : state.unreadCount,
      }

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        hasUnreadMessages: false,
        unreadCount: 0,
      }

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload,
      }

    case 'MARK_AS_READ':
      return {
        ...state,
        hasUnreadMessages: false,
        unreadCount: 0,
      }

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
      }

    case 'SET_SESSION':
      return {
        ...state,
        currentSessionId: action.payload,
      }

    default:
      return state
  }
}

// Create context
const SimChatContext = createContext<SimChatContextValue | undefined>(undefined)

/**
 * Sim Chat Provider Component
 */
export function SimChatProvider({ children, defaultConfig }: SimChatProviderProps) {
  // Merge default config with environment config
  const initialConfig = useMemo(() => {
    const envConfig = getEnvironmentConfig()
    return mergeWithDefaults({ ...defaultConfig, ...envConfig })
  }, [defaultConfig])

  // State management
  const [config, setConfig] = React.useState<SimChatWidgetConfig>(initialConfig)
  const [state, dispatch] = useReducer(chatReducer, initialState)

  // Load persisted state on mount
  useEffect(() => {
    const persistedState = loadPersistedState(config.workspaceId)
    if (persistedState) {
      dispatch({ type: 'UPDATE_STATE', payload: persistedState })
    }
  }, [config.workspaceId])

  // Persist state changes
  useEffect(() => {
    persistState(config.workspaceId, state)
  }, [config.workspaceId, state])

  // Analytics tracking
  const trackEvent = useCallback((event: Partial<ChatAnalyticsEvent>) => {
    if (typeof window === 'undefined') return

    const fullEvent: ChatAnalyticsEvent = {
      timestamp: new Date(),
      sessionId: state.currentSessionId || 'unknown',
      workspaceId: config.workspaceId,
      ...event,
    } as ChatAnalyticsEvent

    logger.info('Chat analytics event', fullEvent)

    // Send to analytics service if configured
    if (config.analyticsEndpoint) {
      fetch(config.analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent),
      }).catch(err => {
        logger.warn('Failed to send analytics event', { error: err.message })
      })
    }
  }, [state.currentSessionId, config.workspaceId, config.analyticsEndpoint])

  // Action implementations
  const actions: SimChatWidgetActions = useMemo(() => ({
    openChat: () => {
      dispatch({ type: 'OPEN_CHAT' })
      trackEvent({ type: 'chat_opened' })
      config.onChatOpen?.()
    },

    closeChat: () => {
      dispatch({ type: 'CLOSE_CHAT' })
      trackEvent({ type: 'chat_closed' })
      config.onChatClose?.()
    },

    minimizeChat: () => {
      dispatch({ type: 'MINIMIZE_CHAT' })
    },

    maximizeChat: () => {
      dispatch({ type: 'MAXIMIZE_CHAT' })
    },

    sendMessage: async (content: string) => {
      try {
        dispatch({ type: 'SET_TYPING', payload: true })

        const message: MessageInterface = {
          id: generateMessageId(),
          content,
          source: 'user',
          timestamp: new Date(),
          status: 'sending',
        }

        dispatch({ type: 'ADD_MESSAGE', payload: message })
        trackEvent({ type: 'message_sent', metadata: { messageLength: content.length } })
        config.onMessageSent?.(message)

        // Here you would typically send the message to the Parlant API
        // This is handled by the ParlantChatbox component internally

      } catch (error) {
        logger.error('Failed to send message', { error, content })
        throw error
      } finally {
        dispatch({ type: 'SET_TYPING', payload: false })
      }
    },

    clearMessages: () => {
      dispatch({ type: 'CLEAR_MESSAGES' })
    },

    markAsRead: () => {
      dispatch({ type: 'MARK_AS_READ' })
    },

    reconnect: async () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' })
      // Reconnection logic would be handled by the ParlantChatbox component
    },
  }), [trackEvent, config])

  // Update configuration
  const updateConfig = useCallback((updates: Partial<SimChatWidgetConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Context value
  const contextValue: SimChatContextValue = useMemo(() => ({
    config,
    state,
    actions,
    updateConfig,
  }), [config, state, actions, updateConfig])

  return (
    <SimChatContext.Provider value={contextValue}>
      {children}
    </SimChatContext.Provider>
  )
}

/**
 * Hook to use the chat context
 */
export function useSimChat(): SimChatContextValue {
  const context = useContext(SimChatContext)
  if (!context) {
    throw new Error('useSimChat must be used within a SimChatProvider')
  }
  return context
}

/**
 * Hook to use chat actions specifically
 */
export function useChatActions(): SimChatWidgetActions {
  const { actions } = useSimChat()
  return actions
}

/**
 * Hook to use chat state specifically
 */
export function useChatState(): SimChatWidgetState {
  const { state } = useSimChat()
  return state
}

/**
 * Hook to use chat configuration specifically
 */
export function useChatConfig(): {
  config: SimChatWidgetConfig
  updateConfig: (updates: Partial<SimChatWidgetConfig>) => void
} {
  const { config, updateConfig } = useSimChat()
  return { config, updateConfig }
}

// Helper functions

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load persisted state from localStorage
 */
function loadPersistedState(workspaceId: string): Partial<SimChatWidgetState> | null {
  if (typeof window === 'undefined') return null

  try {
    const key = `sim-chat-state-${workspaceId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Don't persist open state or connection status
      return {
        ...parsed,
        isOpen: false,
        connectionStatus: 'disconnected',
        isTyping: false,
      }
    }
  } catch (error) {
    logger.warn('Failed to load persisted chat state', { error, workspaceId })
  }

  return null
}

/**
 * Persist state to localStorage
 */
function persistState(workspaceId: string, state: SimChatWidgetState): void {
  if (typeof window === 'undefined') return

  try {
    const key = `sim-chat-state-${workspaceId}`
    const toStore = {
      currentSessionId: state.currentSessionId,
      messages: state.messages.slice(-50), // Keep only last 50 messages
      hasUnreadMessages: state.hasUnreadMessages,
      unreadCount: state.unreadCount,
    }
    localStorage.setItem(key, JSON.stringify(toStore))
  } catch (error) {
    logger.warn('Failed to persist chat state', { error, workspaceId })
  }
}

export default SimChatProvider