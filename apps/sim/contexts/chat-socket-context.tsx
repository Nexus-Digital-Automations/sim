'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { getEnv } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatSocketContext')

/**
 * Chat message interface for real-time messaging
 */
interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant' | 'system'
  timestamp: number
  sessionId: string
  userId?: string
  agentId?: string
  metadata?: {
    isStreaming?: boolean
    isComplete?: boolean
    processingTime?: number
    tokens?: number
    senderName?: string
    senderSocketId?: string
    toolCalls?: Array<{
      id: string
      Name: string
      parameters: any
      result?: any
    }>
  }
}

/**
 * Typing indicator interface
 */
interface TypingIndicator {
  sessionId: string
  userId?: string
  agentId?: string
  isTyping: boolean
  timestamp: number
}

/**
 * Chat presence interface
 */
interface ChatPresence {
  sessionId: string
  userId: string
  userName: string
  socketId: string
  joinedAt: number
  lastActivity: number
  status: 'active' | 'idle' | 'away'
}

/**
 * Chat session data interface
 */
interface ChatSession {
  sessionId: string
  agentId?: string
  workspaceId: string
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  participants: ChatPresence[]
  messageHistory: ChatMessage[]
  isTyping: Record<string, boolean> // userId -> isTyping
}

interface ChatSocketContextType {
  socket: Socket | null
  isConnected: boolean
  isConnecting: boolean
  currentSession: ChatSession | null

  // Session management
  joinChatSession: (sessionId: string, agentId?: string, workspaceId?: string) => Promise<boolean>
  leaveChatSession: () => void

  // Messaging
  sendMessage: (content: string, metadata?: any) => void
  sendTyping: (isTyping: boolean) => void
  updatePresence: (status: 'active' | 'idle' | 'away') => void

  // Message history
  requestHistory: (limit?: number, offset?: number) => void

  // Event handlers
  onMessageReceived: (handler: (message: ChatMessage) => void) => void
  onMessageSent: (handler: (confirmation: { messageId: string; timestamp: number }) => void) => void
  onTypingIndicator: (handler: (indicator: TypingIndicator) => void) => void
  onPresenceUpdated: (handler: (presence: ChatPresence) => void) => void
  onUserJoined: (handler: (presence: ChatPresence) => void) => void
  onUserLeft: (
    handler: (data: { userId: string; socketId: string; timestamp: number }) => void
  ) => void
  onAgentStreamChunk: (
    handler: (data: { messageId: string; chunk: string; isComplete: boolean }) => void
  ) => void
  onSessionStatusChanged: (handler: (data: { sessionId: string; status: string }) => void) => void
  onHistoryResponse: (
    handler: (data: { messages: ChatMessage[]; hasMore: boolean }) => void
  ) => void

  // Error handling
  onError: (handler: (error: { type: string; message: string; details?: any }) => void) => void
}

const ChatSocketContext = createContext<ChatSocketContextType>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  currentSession: null,
  joinChatSession: async () => false,
  leaveChatSession: () => {},
  sendMessage: () => {},
  sendTyping: () => {},
  updatePresence: () => {},
  requestHistory: () => {},
  onMessageReceived: () => {},
  onMessageSent: () => {},
  onTypingIndicator: () => {},
  onPresenceUpdated: () => {},
  onUserJoined: () => {},
  onUserLeft: () => {},
  onAgentStreamChunk: () => {},
  onSessionStatusChanged: () => {},
  onHistoryResponse: () => {},
  onError: () => {},
})

export const useChatSocket = () => useContext(ChatSocketContext)

interface ChatSocketProviderProps {
  children: ReactNode
  user?: {
    id: string
    Name?: string
    email?: string
  }
}

export function ChatSocketProvider({ children, user }: ChatSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const initializedRef = useRef(false)

  // Use refs to store event handlers to avoid stale closures
  const eventHandlers = useRef<{
    messageReceived?: (message: ChatMessage) => void
    messageSent?: (confirmation: { messageId: string; timestamp: number }) => void
    typingIndicator?: (indicator: TypingIndicator) => void
    presenceUpdated?: (presence: ChatPresence) => void
    userJoined?: (presence: ChatPresence) => void
    userLeft?: (data: { userId: string; socketId: string; timestamp: number }) => void
    agentStreamChunk?: (data: { messageId: string; chunk: string; isComplete: boolean }) => void
    sessionStatusChanged?: (data: { sessionId: string; status: string }) => void
    historyResponse?: (data: { messages: ChatMessage[]; hasMore: boolean }) => void
    error?: (error: { type: string; message: string; details?: any }) => void
  }>({})

  // Helper function to generate a fresh socket token
  const generateSocketToken = async (): Promise<string> => {
    const res = await fetch('/api/auth/socket-token', {
      method: 'post',
      credentials: 'include',
      headers: { 'cache-control': 'no-store' },
    })
    if (!res.ok) throw new Error('Failed to generate socket token')
    const body = await res.json().catch(() => ({}))
    const token = body?.token
    if (!token || typeof token !== 'string') throw new Error('Invalid socket token')
    return token
  }

  // Initialize socket when user is available
  useEffect(() => {
    if (!user?.id) return

    // Only initialize if we don't have a socket and aren't already connecting
    if (initializedRef.current || socket || isConnecting) {
      logger.info('Chat socket already exists or is connecting, skipping initialization')
      return
    }

    logger.info('Initializing chat socket connection for user:', user.id)
    initializedRef.current = true
    setIsConnecting(true)

    const initializeSocket = async () => {
      try {
        // Generate initial token for socket authentication
        const token = await generateSocketToken()
        const socketUrl = getEnv('NEXT_PUBLIC_SOCKET_URL') || 'http://localhost:3002'

        logger.info('Attempting to connect to Chat Socket.IO server', {
          url: socketUrl,
          userId: user?.id || 'no-user',
          hasToken: !!token,
          timestamp: new Date().toISOString(),
        })

        const socketInstance = io(socketUrl, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
          reconnectionAttempts: Number.POSITIVE_INFINITY,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
          timeout: 10000,
          auth: async (cb) => {
            try {
              const freshToken = await generateSocketToken()
              cb({ token: freshToken })
            } catch (error) {
              logger.error('Failed to generate fresh token for chat connection:', error)
              cb({ token: null })
            }
          },
        })

        // Connection events
        socketInstance.on('connect', () => {
          setIsConnected(true)
          setIsConnecting(false)
          logger.info('Chat socket connected successfully', {
            socketId: socketInstance.id,
            connected: socketInstance.connected,
            transport: socketInstance.io.engine?.transport?.Name,
          })
        })

        socketInstance.on('disconnect', (reason) => {
          setIsConnected(false)
          setIsConnecting(false)

          logger.info('Chat socket disconnected', { reason })

          // Reset current session on disconnect
          setCurrentSession((prev) =>
            prev ? { ...prev, status: 'disconnected', participants: [] } : null
          )
        })

        socketInstance.on('connect_error', (error: any) => {
          setIsConnecting(false)
          logger.error('Chat socket connection error:', {
            message: error.message,
            stack: error.stack,
            description: error.description,
            type: error.type,
            transport: error.transport,
          })

          eventHandlers.current.error?.({
            type: 'connection_error',
            message: error.message || 'Failed to connect to chat server',
            details: error,
          })
        })

        // Chat-specific event handlers

        // Session management events
        socketInstance.on(
          'chat:join-session-success',
          (data: {
            sessionId: string
            agentId?: string
            workspaceId: string
            roomId: string
            workspaceRoomId: string
            timestamp: number
            presence: ChatPresence
          }) => {
            logger.info(`Successfully joined chat session ${data.sessionId}`)
            setCurrentSession({
              sessionId: data.sessionId,
              agentId: data.agentId,
              workspaceId: data.workspaceId,
              status: 'connected',
              participants: [data.presence],
              messageHistory: [],
              isTyping: {},
            })
          }
        )

        socketInstance.on('chat:join-session-error', (error) => {
          logger.error('Failed to join chat session:', error)
          eventHandlers.current.error?.({
            type: 'join_session_error',
            message: error.error || 'Failed to join chat session',
            details: error,
          })
        })

        // Message events
        socketInstance.on('chat:message-received', (message: ChatMessage) => {
          logger.debug('Chat message received:', message)

          // Add message to session history
          setCurrentSession((prev) => {
            if (!prev || prev.sessionId !== message.sessionId) return prev
            return {
              ...prev,
              messageHistory: [...prev.messageHistory, message],
            }
          })

          eventHandlers.current.messageReceived?.(message)
        })

        socketInstance.on(
          'chat:message-sent',
          (confirmation: { messageId: string; timestamp: number; sessionId: string }) => {
            logger.debug('Chat message sent confirmation:', confirmation)
            eventHandlers.current.messageSent?.(confirmation)
          }
        )

        // Typing and presence events
        socketInstance.on('chat:typing-indicator', (indicator: TypingIndicator) => {
          logger.debug('Typing indicator received:', indicator)

          // Update typing state in session
          if (indicator.userId) {
            setCurrentSession((prev) => {
              if (!prev || prev.sessionId !== indicator.sessionId) return prev
              return {
                ...prev,
                isTyping: {
                  ...prev.isTyping,
                  [indicator.userId!]: indicator.isTyping,
                },
              }
            })
          }

          eventHandlers.current.typingIndicator?.(indicator)
        })

        socketInstance.on('chat:presence-updated', (presence: ChatPresence) => {
          logger.debug('Presence updated:', presence)

          // Update participant presence in session
          setCurrentSession((prev) => {
            if (!prev || prev.sessionId !== presence.sessionId) return prev

            const updatedParticipants = prev.participants.map((p) =>
              p.userId === presence.userId ? presence : p
            )

            return {
              ...prev,
              participants: updatedParticipants,
            }
          })

          eventHandlers.current.presenceUpdated?.(presence)
        })

        socketInstance.on('chat:user-joined', (presence: ChatPresence) => {
          logger.info('User joined chat session:', presence)

          // Add new participant to session
          setCurrentSession((prev) => {
            if (!prev || prev.sessionId !== presence.sessionId) return prev

            // Check if user already exists
            const existingUser = prev.participants.find((p) => p.userId === presence.userId)
            if (existingUser) return prev

            return {
              ...prev,
              participants: [...prev.participants, presence],
            }
          })

          eventHandlers.current.userJoined?.(presence)
        })

        socketInstance.on(
          'chat:user-left',
          (data: { sessionId: string; userId: string; socketId: string; timestamp: number }) => {
            logger.info('User left chat session:', data)

            // Remove participant from session
            setCurrentSession((prev) => {
              if (!prev || prev.sessionId !== data.sessionId) return prev

              return {
                ...prev,
                participants: prev.participants.filter((p) => p.userId !== data.userId),
                isTyping: {
                  ...prev.isTyping,
                  [data.userId]: false,
                },
              }
            })

            eventHandlers.current.userLeft?.(data)
          }
        )

        // Agent streaming events
        socketInstance.on(
          'chat:agent-stream-chunk',
          (data: {
            sessionId: string
            messageId: string
            chunk: string
            isComplete: boolean
            timestamp: number
          }) => {
            logger.debug('Agent stream chunk received:', data)
            eventHandlers.current.agentStreamChunk?.(data)
          }
        )

        // Session status events
        socketInstance.on(
          'chat:session-status-changed',
          (data: { sessionId: string; status: string }) => {
            logger.info('Chat session status changed:', data)

            setCurrentSession((prev) => {
              if (!prev || prev.sessionId !== data.sessionId) return prev
              return {
                ...prev,
                status: data.status as any,
              }
            })

            eventHandlers.current.sessionStatusChanged?.(data)
          }
        )

        // History response events
        socketInstance.on(
          'chat:history-response',
          (data: {
            sessionId: string
            messages: ChatMessage[]
            limit: number
            offset: number
            hasMore: boolean
            timestamp: number
          }) => {
            logger.info('Chat history received:', {
              messageCount: data.messages.length,
              hasMore: data.hasMore,
            })

            // Update session with historical messages
            setCurrentSession((prev) => {
              if (!prev || prev.sessionId !== data.sessionId) return prev
              return {
                ...prev,
                messageHistory:
                  data.offset === 0 ? data.messages : [...data.messages, ...prev.messageHistory],
              }
            })

            eventHandlers.current.historyResponse?.(data)
          }
        )

        // Error handling
        socketInstance.on('chat:send-message-error', (error) => {
          logger.error('Chat message send error:', error)
          eventHandlers.current.error?.({
            type: 'send_message_error',
            message: error.error || 'Failed to send message',
            details: error,
          })
        })

        socketInstance.on('chat:leave-session-error', (error) => {
          logger.error('Chat leave session error:', error)
          eventHandlers.current.error?.({
            type: 'leave_session_error',
            message: error.error || 'Failed to leave session',
            details: error,
          })
        })

        socketInstance.on('chat:request-history-error', (error) => {
          logger.error('Chat history request error:', error)
          eventHandlers.current.error?.({
            type: 'history_request_error',
            message: error.error || 'Failed to fetch chat history',
            details: error,
          })
        })

        setSocket(socketInstance)

        return () => {
          socketInstance.close()
        }
      } catch (error) {
        logger.error('Failed to initialize chat socket with token:', error)
        setIsConnecting(false)
        eventHandlers.current.error?.({
          type: 'initialization_error',
          message: 'Failed to initialize chat connection',
          details: error,
        })
      }
    }

    initializeSocket()

    return () => {
      // Cleanup on unmount only
    }
  }, [user?.id])

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        logger.info('Cleaning up chat socket connection on unmount')
        socket.disconnect()
      }
    }
  }, [])

  // Join chat session
  const joinChatSession = useCallback(
    async (sessionId: string, agentId?: string, workspaceId?: string): Promise<boolean> => {
      if (!socket || !user?.id) {
        logger.warn('Cannot join chat session: socket or user not available')
        return false
      }

      if (!socket.connected) {
        logger.warn('Cannot join chat session: socket not connected')
        return false
      }

      logger.info(`Joining chat session: ${sessionId}`)

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false)
        }, 10000) // 10 second timeout

        const successHandler = () => {
          clearTimeout(timeout)
          resolve(true)
        }

        const errorHandler = () => {
          clearTimeout(timeout)
          resolve(false)
        }

        socket.once('chat:join-session-success', successHandler)
        socket.once('chat:join-session-error', errorHandler)

        socket.emit('chat:join-session', {
          sessionId,
          agentId,
          workspaceId: workspaceId || 'default', // fallback workspace
        })
      })
    },
    [socket, user]
  )

  // Leave chat session
  const leaveChatSession = useCallback(() => {
    if (socket && currentSession) {
      logger.info(`Leaving chat session: ${currentSession.sessionId}`)
      socket.emit('chat:leave-session', {
        sessionId: currentSession.sessionId,
      })
      setCurrentSession(null)
    }
  }, [socket, currentSession])

  // Send message
  const sendMessage = useCallback(
    (content: string, metadata?: any) => {
      if (!socket || !currentSession || !user?.id) {
        logger.warn('Cannot send message: missing socket, session, or user')
        return
      }

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content,
        type: 'user',
        timestamp: Date.now(),
        sessionId: currentSession.sessionId,
        userId: user.id,
        metadata,
      }

      // Optimistically add message to local history
      setCurrentSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          messageHistory: [...prev.messageHistory, message],
        }
      })

      socket.emit('chat:send-message', { message })
      logger.debug('Sent chat message:', message)
    },
    [socket, currentSession, user]
  )

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (socket && currentSession) {
        socket.emit('chat:typing', {
          sessionId: currentSession.sessionId,
          isTyping,
        })
        logger.debug(`Sent typing indicator: ${isTyping}`)
      }
    },
    [socket, currentSession]
  )

  // Update presence status
  const updatePresence = useCallback(
    (status: 'active' | 'idle' | 'away') => {
      if (socket && currentSession) {
        socket.emit('chat:update-presence', {
          sessionId: currentSession.sessionId,
          status,
        })
        logger.debug(`Updated presence: ${status}`)
      }
    },
    [socket, currentSession]
  )

  // Request message history
  const requestHistory = useCallback(
    (limit = 50, offset = 0) => {
      if (socket && currentSession) {
        socket.emit('chat:request-history', {
          sessionId: currentSession.sessionId,
          limit,
          offset,
        })
        logger.debug(`Requested chat history: limit=${limit}, offset=${offset}`)
      }
    },
    [socket, currentSession]
  )

  // Event handler registration functions
  const onMessageReceived = useCallback((handler: (message: ChatMessage) => void) => {
    eventHandlers.current.messageReceived = handler
  }, [])

  const onMessageSent = useCallback(
    (handler: (confirmation: { messageId: string; timestamp: number }) => void) => {
      eventHandlers.current.messageSent = handler
    },
    []
  )

  const onTypingIndicator = useCallback((handler: (indicator: TypingIndicator) => void) => {
    eventHandlers.current.typingIndicator = handler
  }, [])

  const onPresenceUpdated = useCallback((handler: (presence: ChatPresence) => void) => {
    eventHandlers.current.presenceUpdated = handler
  }, [])

  const onUserJoined = useCallback((handler: (presence: ChatPresence) => void) => {
    eventHandlers.current.userJoined = handler
  }, [])

  const onUserLeft = useCallback(
    (handler: (data: { userId: string; socketId: string; timestamp: number }) => void) => {
      eventHandlers.current.userLeft = handler
    },
    []
  )

  const onAgentStreamChunk = useCallback(
    (handler: (data: { messageId: string; chunk: string; isComplete: boolean }) => void) => {
      eventHandlers.current.agentStreamChunk = handler
    },
    []
  )

  const onSessionStatusChanged = useCallback(
    (handler: (data: { sessionId: string; status: string }) => void) => {
      eventHandlers.current.sessionStatusChanged = handler
    },
    []
  )

  const onHistoryResponse = useCallback(
    (handler: (data: { messages: ChatMessage[]; hasMore: boolean }) => void) => {
      eventHandlers.current.historyResponse = handler
    },
    []
  )

  const onError = useCallback(
    (handler: (error: { type: string; message: string; details?: any }) => void) => {
      eventHandlers.current.error = handler
    },
    []
  )

  return (
    <ChatSocketContext.Provider
      value={{
        socket,
        isConnected,
        isConnecting,
        currentSession,
        joinChatSession,
        leaveChatSession,
        sendMessage,
        sendTyping,
        updatePresence,
        requestHistory,
        onMessageReceived,
        onMessageSent,
        onTypingIndicator,
        onPresenceUpdated,
        onUserJoined,
        onUserLeft,
        onAgentStreamChunk,
        onSessionStatusChanged,
        onHistoryResponse,
        onError,
      }}
    >
      {children}
    </ChatSocketContext.Provider>
  )
}

// Export types for external use
export type { ChatMessage, TypingIndicator, ChatPresence, ChatSession }
