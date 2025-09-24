'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { useChatSocket, type ChatMessage, type ChatPresence } from '@/contexts/chat-socket-context'

const logger = createLogger('RealTimeChat')

interface RealTimeChatProps {
  sessionId: string
  agentId?: string
  workspaceId: string
  userId: string
  userName?: string
  className?: string
  onError?: (error: string) => void
}

interface TypingUsers {
  [userId: string]: {
    name: string
    isTyping: boolean
    lastUpdate: number
  }
}

export function RealTimeChat({
  sessionId,
  agentId,
  workspaceId,
  userId,
  userName,
  className = '',
  onError,
}: RealTimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({})
  const [participants, setParticipants] = useState<ChatPresence[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessages, setStreamingMessages] = useState<Map<string, string>>(new Map())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const {
    socket,
    isConnected: socketConnected,
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
    onError: onSocketError,
  } = useChatSocket()

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Join chat session on mount
  useEffect(() => {
    if (!socketConnected || isJoining || currentSession?.sessionId === sessionId) {
      return
    }

    logger.info(`Joining chat session: ${sessionId}`)
    setIsJoining(true)

    joinChatSession(sessionId, agentId, workspaceId)
      .then((success) => {
        if (success) {
          setIsConnected(true)
          // Request message history after successful join
          requestHistory(50, 0)
        } else {
          onError?.('Failed to join chat session')
        }
      })
      .catch((error) => {
        logger.error('Error joining chat session:', error)
        onError?.('Failed to join chat session')
      })
      .finally(() => {
        setIsJoining(false)
      })
  }, [socketConnected, sessionId, agentId, workspaceId, isJoining, currentSession, joinChatSession, requestHistory, onError])

  // Leave session on unmount
  useEffect(() => {
    return () => {
      if (currentSession?.sessionId === sessionId) {
        leaveChatSession()
      }
    }
  }, [sessionId, currentSession, leaveChatSession])

  // Handle socket events
  useEffect(() => {
    // Message received handler
    onMessageReceived((message: ChatMessage) => {
      if (message.sessionId === sessionId) {
        setMessages(prev => {
          // Avoid duplicates by checking if message already exists
          const exists = prev.find(m => m.id === message.id)
          if (exists) return prev
          return [...prev, message]
        })
        scrollToBottom()
      }
    })

    // Message sent confirmation handler
    onMessageSent((confirmation) => {
      logger.debug('Message sent confirmation:', confirmation)
      // Could update message status here if needed
    })

    // Typing indicator handler
    onTypingIndicator((indicator) => {
      if (indicator.sessionId === sessionId && indicator.userId && indicator.userId !== userId) {
        setTypingUsers(prev => ({
          ...prev,
          [indicator.userId!]: {
            name: 'User', // This would come from participant data
            isTyping: indicator.isTyping,
            lastUpdate: Date.now(),
          }
        }))

        // Clear typing indicator after timeout
        if (indicator.isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => ({
              ...prev,
              [indicator.userId!]: {
                ...prev[indicator.userId!],
                isTyping: false,
              }
            }))
          }, 3000)
        }
      }
    })

    // Presence updated handler
    onPresenceUpdated((presence) => {
      if (presence.sessionId === sessionId) {
        setParticipants(prev =>
          prev.map(p => p.userId === presence.userId ? presence : p)
        )
      }
    })

    // User joined handler
    onUserJoined((presence) => {
      if (presence.sessionId === sessionId) {
        setParticipants(prev => {
          const exists = prev.find(p => p.userId === presence.userId)
          if (exists) return prev
          return [...prev, presence]
        })
      }
    })

    // User left handler
    onUserLeft((data) => {
      setParticipants(prev =>
        prev.filter(p => p.userId !== data.userId)
      )
    })

    // Agent streaming handler
    onAgentStreamChunk((data) => {
      if (!data.isComplete) {
        // Update streaming message
        setStreamingMessages(prev => {
          const newMap = new Map(prev)
          const currentContent = newMap.get(data.messageId) || ''
          newMap.set(data.messageId, currentContent + data.chunk)
          return newMap
        })
      } else {
        // Finalize streaming message
        setStreamingMessages(prev => {
          const newMap = new Map(prev)
          newMap.delete(data.messageId)
          return newMap
        })
      }
      scrollToBottom()
    })

    // Error handler
    onSocketError((error) => {
      logger.error('Chat socket error:', error)
      onError?.(error.message)
    })
  }, [sessionId, userId, onMessageReceived, onMessageSent, onTypingIndicator, onPresenceUpdated, onUserJoined, onUserLeft, onAgentStreamChunk, onSocketError, onError, scrollToBottom])

  // Update presence to active on focus
  useEffect(() => {
    const handleFocus = () => {
      if (isConnected) {
        updatePresence('active')
      }
    }

    const handleBlur = () => {
      if (isConnected) {
        updatePresence('idle')
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [isConnected, updatePresence])

  // Handle input change and typing indicators
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)

    // Send typing indicator
    if (isConnected) {
      sendTyping(true)

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false)
      }, 2000)
    }
  }, [isConnected, sendTyping])

  // Handle message submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim() || !isConnected) {
      return
    }

    logger.debug('Sending message:', inputValue)
    setIsLoading(true)

    // Send message through socket
    sendMessage(inputValue.trim(), {
      senderName: userName,
      timestamp: Date.now(),
    })

    // Clear input
    setInputValue('')

    // Stop typing indicator
    sendTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setIsLoading(false)
  }, [inputValue, isConnected, sendMessage, userName, sendTyping])

  // Handle key press for sending
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }, [handleSubmit])

  // Format message timestamp
  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  // Get typing users display
  const typingUsersDisplay = Object.entries(typingUsers)
    .filter(([_, data]) => data.isTyping)
    .map(([userId, data]) => data.name)
    .join(', ')

  // Connection status display
  if (!socketConnected) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Connecting to chat server...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isJoining) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Joining chat session...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to connect to chat session</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold">Chat Session</h3>
          <p className="text-sm text-gray-600">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
            {agentId && ' • AI Assistant Active'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-500 text-white'
                : message.type === 'assistant'
                ? 'bg-gray-200 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTimestamp(message.timestamp)}
                {message.metadata?.senderName && ` • ${message.metadata.senderName}`}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming messages */}
        {Array.from(streamingMessages.entries()).map(([messageId, content]) => (
          <div key={messageId} className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
              <p className="text-sm">{content}</p>
              <p className="text-xs mt-1 text-gray-500">
                <span className="animate-pulse">●</span> Streaming...
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicators */}
        {typingUsersDisplay && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-600">
              <p className="text-sm">
                <span className="animate-pulse">●●●</span> {typingUsersDisplay} {typingUsersDisplay.includes(',') ? 'are' : 'is'} typing...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!isConnected || isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !isConnected || isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}