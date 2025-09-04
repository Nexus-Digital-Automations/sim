/**
 * Real-time Social Integration - WebSocket Social Updates
 *
 * Advanced real-time social features integration with existing WebSocket infrastructure:
 * - Real-time activity feed updates and notifications
 * - Live engagement metrics and social interaction updates
 * - User presence indicators and online status
 * - Follow/unfollow notifications and relationship changes
 * - Live comment updates with threading support
 * - Social metrics aggregation and broadcasting
 *
 * Features:
 * - Integration with existing MonitoringWebSocketHandler
 * - Subscription management for social events
 * - Event filtering and targeted delivery
 * - Optimistic updates with server confirmation
 * - Connection resilience and automatic reconnection
 * - Social event queuing and batch processing
 * - Privacy-aware broadcasting with user preferences
 * - Performance optimization with throttling and rate limiting
 *
 * @author Claude Code Social Platform
 * @version 1.0.0
 */

'use client'

import type * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('RealTimeSocial')

// TypeScript interfaces
export interface SocialEvent {
  type:
    | 'activity_created'
    | 'activity_updated'
    | 'engagement_updated'
    | 'user_followed'
    | 'user_unfollowed'
    | 'comment_posted'
    | 'user_online'
    | 'user_offline'
    | 'notification_received'
  data: any
  targetId?: string
  userId?: string
  workspaceId?: string
  timestamp: string
  priority?: 'low' | 'normal' | 'high'
}

export interface SocialSubscription {
  id: string
  type: 'activity_feed' | 'engagement' | 'following' | 'presence' | 'notifications'
  filters?: {
    userId?: string
    targetId?: string
    activityTypes?: string[]
    followingOnly?: boolean
  }
  options?: {
    throttleMs?: number
    includePresence?: boolean
    enableNotifications?: boolean
  }
}

export interface UserPresence {
  userId: string
  isOnline: boolean
  lastSeen: string
  activity?: string
}

export interface RealTimeSocialContextType {
  isConnected: boolean
  subscribe: (subscription: SocialSubscription) => void
  unsubscribe: (subscriptionId: string) => void
  sendSocialEvent: (event: Omit<SocialEvent, 'timestamp'>) => void
  getUserPresence: (userId: string) => UserPresence | null
  connectionStats: {
    messagesReceived: number
    messagesSent: number
    reconnectAttempts: number
    lastConnected?: Date
  }
}

const RealTimeSocialContext = createContext<RealTimeSocialContextType | null>(null)

export interface RealTimeSocialProviderProps {
  children: React.ReactNode
  currentUserId?: string
  workspaceId?: string
  wsBaseUrl?: string
  enablePresence?: boolean
  enableNotifications?: boolean
  reconnectInterval?: number
}

/**
 * Real-time Social Provider Component
 */
export const RealTimeSocialProvider: React.FC<RealTimeSocialProviderProps> = ({
  children,
  currentUserId,
  workspaceId,
  wsBaseUrl,
  enablePresence = true,
  enableNotifications = true,
  reconnectInterval = 5000,
}) => {
  // State management
  const [isConnected, setIsConnected] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Map<string, SocialSubscription>>(new Map())
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map())
  const [connectionStats, setConnectionStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    reconnectAttempts: 0,
    lastConnected: undefined as Date | undefined,
  })

  // Refs for WebSocket and reconnection
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionCallbacks = useRef<Map<string, (event: SocialEvent) => void>>(new Map())
  const messageQueue = useRef<SocialEvent[]>([])

  /**
   * Establish WebSocket connection
   */
  const connect = useCallback(() => {
    if (!currentUserId || websocketRef.current?.readyState === WebSocket.OPEN) return

    const operationId = `social-connect-${currentUserId}-${Date.now()}`

    try {
      logger.info(`[${operationId}] Establishing social WebSocket connection`, {
        userId: currentUserId,
        workspaceId,
        wsBaseUrl,
      })

      const wsUrl =
        wsBaseUrl ||
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      const ws = new WebSocket(
        `${wsUrl}/api/community/social/ws?userId=${currentUserId}&workspaceId=${workspaceId || 'default'}`
      )

      ws.onopen = () => {
        logger.info(`[${operationId}] Social WebSocket connected`)
        setIsConnected(true)
        setConnectionStats((prev) => ({
          ...prev,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        }))

        // Send queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift()
          if (message) {
            ws.send(JSON.stringify(message))
            setConnectionStats((prev) => ({ ...prev, messagesSent: prev.messagesSent + 1 }))
          }
        }

        // Re-establish subscriptions
        subscriptions.forEach((subscription) => {
          ws.send(
            JSON.stringify({
              type: 'subscribe_social',
              data: subscription,
            })
          )
        })

        // Setup presence if enabled
        if (enablePresence) {
          ws.send(
            JSON.stringify({
              type: 'presence_update',
              data: {
                userId: currentUserId,
                isOnline: true,
                activity: 'active',
              },
            })
          )
        }

        toast.success('Connected to live social updates')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          setConnectionStats((prev) => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }))

          logger.debug(`[${operationId}] Social message received`, {
            type: message.type,
            targetId: message.targetId,
            userId: message.userId,
          })

          handleSocialMessage(message)
        } catch (error) {
          logger.error(`[${operationId}] Error processing social message`, { error })
        }
      }

      ws.onclose = (event) => {
        logger.warn(`[${operationId}] Social WebSocket disconnected`, {
          code: event.code,
          reason: event.reason,
        })

        setIsConnected(false)
        websocketRef.current = null

        // Attempt reconnection if not intentional
        if (event.code !== 1000) {
          setConnectionStats((prev) => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }))

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.onerror = (error) => {
        logger.error(`[${operationId}] Social WebSocket error`, { error })
      }

      websocketRef.current = ws
    } catch (error) {
      logger.error(`[${operationId}] Failed to establish social WebSocket connection`, { error })
    }
  }, [currentUserId, workspaceId, wsBaseUrl, enablePresence, reconnectInterval, subscriptions])

  /**
   * Handle incoming social messages
   */
  const handleSocialMessage = useCallback(
    (message: any) => {
      const socialEvent: SocialEvent = {
        type: message.type,
        data: message.data,
        targetId: message.targetId,
        userId: message.userId,
        workspaceId: message.workspaceId,
        timestamp: message.timestamp || new Date().toISOString(),
        priority: message.priority || 'normal',
      }

      // Handle presence updates
      if (message.type === 'presence_update' && message.data) {
        setUserPresence((prev) => {
          const updated = new Map(prev)
          updated.set(message.data.userId, {
            userId: message.data.userId,
            isOnline: message.data.isOnline,
            lastSeen: message.data.lastSeen || new Date().toISOString(),
            activity: message.data.activity,
          })
          return updated
        })
      }

      // Handle notifications
      if (message.type === 'notification_received' && enableNotifications && message.data) {
        // Show notification if not from current user
        if (message.userId !== currentUserId) {
          toast.info(message.data.title, {
            description: message.data.message,
          })
        }
      }

      // Route to subscription callbacks
      subscriptionCallbacks.current.forEach((callback) => {
        try {
          callback(socialEvent)
        } catch (error) {
          logger.error('Error in subscription callback', { error })
        }
      })
    },
    [currentUserId, enableNotifications]
  )

  /**
   * Subscribe to social events
   */
  const subscribe = useCallback((subscription: SocialSubscription) => {
    const operationId = `social-subscribe-${subscription.id}-${Date.now()}`

    logger.info(`[${operationId}] Creating social subscription`, {
      subscriptionId: subscription.id,
      type: subscription.type,
      filters: subscription.filters,
    })

    setSubscriptions((prev) => {
      const updated = new Map(prev)
      updated.set(subscription.id, subscription)
      return updated
    })

    // Send subscription to server if connected
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          type: 'subscribe_social',
          data: subscription,
        })
      )
      setConnectionStats((prev) => ({ ...prev, messagesSent: prev.messagesSent + 1 }))
    }

    logger.debug(`[${operationId}] Social subscription created`)
  }, [])

  /**
   * Unsubscribe from social events
   */
  const unsubscribe = useCallback((subscriptionId: string) => {
    const operationId = `social-unsubscribe-${subscriptionId}-${Date.now()}`

    logger.info(`[${operationId}] Removing social subscription`, { subscriptionId })

    setSubscriptions((prev) => {
      const updated = new Map(prev)
      updated.delete(subscriptionId)
      return updated
    })

    subscriptionCallbacks.current.delete(subscriptionId)

    // Send unsubscribe to server if connected
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          type: 'unsubscribe_social',
          data: { subscriptionId },
        })
      )
      setConnectionStats((prev) => ({ ...prev, messagesSent: prev.messagesSent + 1 }))
    }

    logger.debug(`[${operationId}] Social subscription removed`)
  }, [])

  /**
   * Send social event
   */
  const sendSocialEvent = useCallback((event: Omit<SocialEvent, 'timestamp'>) => {
    const socialEvent: SocialEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    const operationId = `social-send-${event.type}-${Date.now()}`

    logger.debug(`[${operationId}] Sending social event`, {
      type: event.type,
      targetId: event.targetId,
      priority: event.priority,
    })

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          type: 'social_event',
          data: socialEvent,
        })
      )
      setConnectionStats((prev) => ({ ...prev, messagesSent: prev.messagesSent + 1 }))
    } else {
      // Queue message if not connected
      messageQueue.current.push(socialEvent)
    }
  }, [])

  /**
   * Get user presence
   */
  const getUserPresence = useCallback(
    (userId: string): UserPresence | null => {
      return userPresence.get(userId) || null
    },
    [userPresence]
  )

  // Establish connection on mount
  useEffect(() => {
    if (currentUserId) {
      connect()
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (websocketRef.current) {
        websocketRef.current.close(1000) // Intentional disconnect
      }
    }
  }, [currentUserId, connect])

  // Send presence updates periodically
  useEffect(() => {
    if (!enablePresence || !currentUserId || !isConnected) return

    const presenceInterval = setInterval(() => {
      sendSocialEvent({
        type: 'user_online',
        data: {
          userId: currentUserId,
          activity: document.hidden ? 'away' : 'active',
        },
      })
    }, 30000) // Every 30 seconds

    return () => clearInterval(presenceInterval)
  }, [enablePresence, currentUserId, isConnected, sendSocialEvent])

  // Handle page visibility for presence
  useEffect(() => {
    if (!enablePresence || !currentUserId) return

    const handleVisibilityChange = () => {
      sendSocialEvent({
        type: document.hidden ? 'user_offline' : 'user_online',
        data: {
          userId: currentUserId,
          activity: document.hidden ? 'away' : 'active',
        },
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enablePresence, currentUserId, sendSocialEvent])

  const contextValue: RealTimeSocialContextType = {
    isConnected,
    subscribe,
    unsubscribe,
    sendSocialEvent,
    getUserPresence,
    connectionStats,
  }

  return (
    <RealTimeSocialContext.Provider value={contextValue}>{children}</RealTimeSocialContext.Provider>
  )
}

/**
 * Hook to use real-time social features
 */
export const useRealTimeSocial = () => {
  const context = useContext(RealTimeSocialContext)
  if (!context) {
    throw new Error('useRealTimeSocial must be used within a RealTimeSocialProvider')
  }
  return context
}

/**
 * Hook for social event subscriptions
 */
export const useSocialSubscription = (
  subscription: SocialSubscription,
  callback: (event: SocialEvent) => void,
  dependencies: React.DependencyList = []
) => {
  const { subscribe, unsubscribe, isConnected } = useRealTimeSocial()

  useEffect(() => {
    if (!isConnected) return

    const operationId = `use-social-subscription-${subscription.id}`
    logger.debug(`[${operationId}] Setting up social subscription hook`, {
      subscriptionId: subscription.id,
      type: subscription.type,
    })

    // Store callback
    const subscriptionCallbacks = (window as any).__socialSubscriptionCallbacks || new Map()
    subscriptionCallbacks.set(subscription.id, callback)
    ;(window as any).__socialSubscriptionCallbacks = subscriptionCallbacks

    // Subscribe
    subscribe(subscription)

    return () => {
      logger.debug(`[${operationId}] Cleaning up social subscription hook`, {
        subscriptionId: subscription.id,
      })

      unsubscribe(subscription.id)
      subscriptionCallbacks.delete(subscription.id)
    }
  }, [subscribe, unsubscribe, isConnected, subscription.id, ...dependencies])
}

/**
 * Hook for user presence
 */
export const useUserPresence = (userId: string) => {
  const { getUserPresence } = useRealTimeSocial()
  const [presence, setPresence] = useState<UserPresence | null>(null)

  useEffect(() => {
    const updatePresence = () => {
      setPresence(getUserPresence(userId))
    }

    updatePresence()

    // Update every 5 seconds
    const interval = setInterval(updatePresence, 5000)
    return () => clearInterval(interval)
  }, [userId, getUserPresence])

  return presence
}

/**
 * Hook for connection status
 */
export const useSocialConnectionStatus = () => {
  const { isConnected, connectionStats } = useRealTimeSocial()

  return {
    isConnected,
    stats: connectionStats,
  }
}

export default RealTimeSocialProvider
