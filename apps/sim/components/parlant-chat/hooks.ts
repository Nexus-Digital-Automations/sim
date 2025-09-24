/**
 * Custom hooks for Parlant Chat integration
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SimChatConfig, SimChatMessage } from './types'

/**
 * Hook for managing chat theme based on Sim's theme system
 */
export function useChatTheme(config: SimChatConfig) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (config.theme === 'auto') {
      // Listen to system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light')
      }

      setTheme(mediaQuery.matches ? 'dark' : 'light')
      mediaQuery.addEventListener('change', handleChange)

      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    if (config.theme) {
      setTheme(config.theme)
    }
  }, [config.theme])

  // Also listen to Sim's theme changes via CSS classes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const hasSimDarkClass = document.documentElement.classList.contains('dark')
          if (config.theme === 'auto') {
            setTheme(hasSimDarkClass ? 'dark' : 'light')
          }
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [config.theme])

  return theme
}

/**
 * Hook for managing chat connection and messages
 */
export function useChatConnection(config: SimChatConfig) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<SimChatMessage[]>([])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!isConnected || isLoading) return

      setIsLoading(true)
      setError(null)

      try {
        // Add user message immediately
        const userMessage: SimChatMessage = {
          id: crypto.randomUUID(),
          content: message,
          type: 'user',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMessage])

        // This is where you would integrate with the actual Parlant API
        // For now, we'll simulate a response
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Add simulated agent response
        const agentMessage: SimChatMessage = {
          id: crypto.randomUUID(),
          content: `This is a response to: "${message}"`,
          type: 'agent',
          timestamp: new Date(),
          metadata: {
            agentId: config.agentId,
            confidence: 0.95,
          },
        }
        setMessages((prev) => [...prev, agentMessage])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
      } finally {
        setIsLoading(false)
      }
    },
    [isConnected, isLoading, config.agentId]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const reconnect = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate connection
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconnect')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize connection
  useEffect(() => {
    if (config.server && config.agentId) {
      reconnect()
    }
  }, [config.server, config.agentId, reconnect])

  return {
    isConnected,
    isLoading,
    error,
    messages,
    sendMessage,
    clearChat,
    reconnect,
  }
}

/**
 * Hook for managing chat widget state
 */
export function useChatWidget(initialConfig: SimChatConfig) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [config, setConfig] = useState(initialConfig)

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
    setIsMinimized(false)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  const minimize = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const updateConfig = useCallback((updates: Partial<SimChatConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  return {
    isOpen,
    isMinimized,
    config,
    toggleOpen,
    open,
    close,
    minimize,
    updateConfig,
  }
}

/**
 * Hook for accessing chat analytics
 */
export function useChatAnalytics(sessionId?: string) {
  const [analytics, setAnalytics] = useState({
    messageCount: 0,
    sessionDuration: 0,
    userSatisfaction: null as number | null,
    commonIntents: [] as string[],
  })

  useEffect(() => {
    if (!sessionId) return

    // Track session analytics
    const startTime = Date.now()

    return () => {
      const endTime = Date.now()
      const duration = endTime - startTime

      // Send analytics data (in a real implementation)
      console.log('Session analytics:', {
        sessionId,
        duration,
        ...analytics,
      })
    }
  }, [sessionId, analytics])

  const incrementMessageCount = useCallback(() => {
    setAnalytics((prev) => ({
      ...prev,
      messageCount: prev.messageCount + 1,
    }))
  }, [])

  const setUserSatisfaction = useCallback((satisfaction: number) => {
    setAnalytics((prev) => ({
      ...prev,
      userSatisfaction: satisfaction,
    }))
  }, [])

  const addIntent = useCallback((intent: string) => {
    setAnalytics((prev) => ({
      ...prev,
      commonIntents: Array.from(new Set([...prev.commonIntents, intent])),
    }))
  }, [])

  return {
    analytics,
    incrementMessageCount,
    setUserSatisfaction,
    addIntent,
  }
}

/**
 * Hook for keyboard shortcuts
 */
export function useChatKeyboardShortcuts(callbacks: {
  onToggle?: () => void
  onFocus?: () => void
  onEscape?: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle chat with Cmd/Ctrl + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        callbacks.onToggle?.()
      }

      // Focus chat input with Cmd/Ctrl + /
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault()
        callbacks.onFocus?.()
      }

      // Close chat with Escape
      if (event.key === 'Escape') {
        callbacks.onEscape?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [callbacks])
}
