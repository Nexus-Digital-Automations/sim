'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Chatbox, { type ChatProps } from 'parlant-chat-react'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import { createParlantSocketClient, type ParlantSocketClient } from './socket-client'

const logger = createLogger('ParlantChatInterface')

interface Agent {
  id: string
  name: string
  description?: string
  workspace_id: string
  model: string
  temperature: number
}

interface ParlantChatInterfaceProps {
  agent: Agent
  workspaceId: string
  userId: string
  conversationId?: string
}

interface SocketMessage {
  sessionId: string
  messageId: string
  workspaceId: string
  content: string
  messageType: 'user' | 'assistant'
  userId?: string
  metadata?: any
}

interface AgentStatus {
  agentId: string
  workspaceId: string
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'PROCESSING'
  metadata?: any
}

/**
 * ParlantChatInterface - Integrates parlant-chat-react with Sim's Socket.io infrastructure
 *
 * Features:
 * - Real-time messaging via Socket.io
 * - Workspace-scoped message routing
 * - Agent presence indicators
 * - Secure authentication and message validation
 * - Cross-tenant isolation
 */
export function ParlantChatInterface({
  agent,
  workspaceId,
  userId,
  conversationId,
}: ParlantChatInterfaceProps) {
  const { data: session } = useSession()
  const socketClientRef = useRef<ParlantSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [agentStatus, setAgentStatus] = useState<AgentStatus['status']>('OFFLINE')
  const [sessionId, setSessionId] = useState<string>(conversationId || '')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [agentPerformance, setAgentPerformance] = useState<{
    totalSessions: number
    totalMessages: number
    averageResponseTime: number
    successRate: number
  } | null>(null)

  // Enhanced Socket.io connection with typed client
  useEffect(() => {
    if (!session?.user) return

    const initializeSocketConnection = async () => {
      try {
        const SOCKET_PORT = env.SOCKET_PORT || 3002
        const socketUrl = `http://localhost:${SOCKET_PORT}`

        logger.info('Initializing Parlant Socket.io client', {
          url: socketUrl,
          workspaceId,
          agentId: agent.id,
          userId,
        })

        // Create typed socket client
        const socketClient = createParlantSocketClient({
          serverUrl: socketUrl,
          authToken: session.accessToken || 'temp-token', // Use session token for authentication
          userId,
          workspaceId,
          agentId: agent.id,
          timeout: 20000,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        })

        socketClientRef.current = socketClient

        // Set up event handlers before connecting
        setupSocketEventHandlers(socketClient)

        // Connect to Socket.io server
        await socketClient.connect()
        setIsConnected(true)
        setConnectionError(null)

        // Join agent room for real-time updates
        await socketClient.joinAgentRoom(agent.id, workspaceId)

        // Join workspace messaging for general updates
        await socketClient.joinWorkspaceMessaging(workspaceId, ['general', 'agents'])

        // Update presence to online
        socketClient.updatePresence(workspaceId, 'online')

        // Request current agent status
        socketClient.requestAgentStatus(agent.id, workspaceId)

        logger.info('Successfully connected and joined rooms')
      } catch (error) {
        logger.error('Failed to initialize socket connection', error)
        setConnectionError(`Connection failed: ${error.message}`)
        setIsConnected(false)
      }
    }

    initializeSocketConnection()

    // Cleanup on unmount
    return () => {
      if (socketClientRef.current) {
        logger.info('Cleaning up Parlant Socket.io connection')
        socketClientRef.current.disconnect()
        socketClientRef.current = null
      }
      setIsConnected(false)
    }
  }, [session, workspaceId, agent.id, userId])

  // Set up Socket.io event handlers
  const setupSocketEventHandlers = (socketClient: ParlantSocketClient) => {
    // Agent status and performance events
    socketClient.on('agent-status-update', (data) => {
      if (data.agentId === agent.id) {
        logger.debug('Agent status updated', data)
        setAgentStatus(data.status)
      }
    })

    socketClient.on('agent-performance-update', (data) => {
      if (data.agentId === agent.id) {
        logger.debug('Agent performance updated', data)
        setAgentPerformance(data.performance)
      }
    })

    // Session lifecycle events
    socketClient.on('session-started', (data) => {
      if (data.agentId === agent.id) {
        logger.info('Session started', data)
        setSessionId(data.sessionId)
      }
    })

    socketClient.on('session-ended', (data) => {
      if (data.sessionId === sessionId) {
        logger.info('Session ended', data)
        // Handle session end - could redirect or show summary
      }
    })

    // Real-time message events
    socketClient.on('message-sent', (data) => {
      logger.debug('Real-time message sent event', data)
      // Message already handled by parlant-chat-react, just log for debugging
    })

    socketClient.on('message-received', (data) => {
      logger.debug('Real-time message received event', data)
      // Message handled by parlant-chat-react streaming
    })

    socketClient.on('typing-indicator', (data) => {
      logger.debug('Typing indicator update', data)
      // Could update UI to show typing indicator
    })

    // Tool call events for real-time feedback
    socketClient.on('tool-call-started', (data) => {
      logger.debug('Tool call started', data)
      // Could show tool execution status in UI
    })

    socketClient.on('tool-call-completed', (data) => {
      logger.debug('Tool call completed', data)
      // Could update UI with tool results
    })

    socketClient.on('tool-call-failed', (data) => {
      logger.debug('Tool call failed', data)
      // Could show error in UI
    })

    // Error handling
    socketClient.on('error', (error) => {
      logger.error('Socket.io error', error)
      setConnectionError(`Socket error: ${error}`)
    })
  }

  // Notify Socket.io when session is created by parlant-chat-react
  const handleSessionCreated = async (newSessionId: string) => {
    logger.info('Parlant session created', { sessionId: newSessionId })
    setSessionId(newSessionId)

    // Emit session start event to Socket.io using typed client
    if (socketClientRef.current?.isConnected()) {
      try {
        // Join session room for real-time conversation updates
        await socketClientRef.current.joinSessionRoom(newSessionId, agent.id, workspaceId)

        // Notify about session start
        socketClientRef.current.notifySessionStarted(newSessionId, agent.id, workspaceId, userId, {
          agentName: agent.name,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        })

        logger.info('Successfully joined session room and notified session start', {
          sessionId: newSessionId,
        })
      } catch (error) {
        logger.error('Failed to join session room or notify session start', error)
      }
    }
  }

  // Custom header component showing connection status and agent status
  const renderHeader = ({
    changeIsExpanded,
    agentName,
  }: {
    changeIsExpanded: () => void
    agentName: string | undefined
  }) => {
    const statusColor =
      {
        ONLINE: 'bg-green-500',
        OFFLINE: 'bg-gray-500',
        BUSY: 'bg-yellow-500',
        PROCESSING: 'bg-blue-500',
      }[agentStatus] || 'bg-gray-500'

    const statusText =
      {
        ONLINE: 'Online',
        OFFLINE: 'Offline',
        BUSY: 'Busy',
        PROCESSING: 'Processing...',
      }[agentStatus] || 'Unknown'

    return (
      <div className='flex items-center justify-between border-gray-200 border-b p-3'>
        <div className='flex items-center space-x-3'>
          <div className='relative'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-semibold text-white'>
              {(agentName || agent.name).charAt(0).toUpperCase()}
            </div>
            <div
              className={`-bottom-1 -right-1 absolute h-3 w-3 rounded-full border-2 border-white ${statusColor}`}
            />
          </div>
          <div>
            <h3 className='font-semibold text-gray-900'>{agentName || agent.name}</h3>
            <div className='flex items-center space-x-2 text-gray-500 text-xs'>
              <span>{statusText}</span>
              {isConnected && (
                <>
                  <span>•</span>
                  <span className='text-green-600'>Real-time</span>
                </>
              )}
              {agentPerformance && (
                <>
                  <span>•</span>
                  <span>{agentPerformance.totalSessions} sessions</span>
                  <span>•</span>
                  <span>{agentPerformance.averageResponseTime.toFixed(0)}ms avg</span>
                  <span>•</span>
                  <span>{(agentPerformance.successRate * 100).toFixed(0)}% success</span>
                </>
              )}
              {connectionError && (
                <>
                  <span>•</span>
                  <span className='text-red-500'>Connection Error</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button onClick={changeIsExpanded} className='rounded p-1 hover:bg-gray-100'>
          <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>
      </div>
    )
  }

  // Prepare ChatProps for parlant-chat-react integration
  const chatProps: ChatProps = {
    server: env.PARLANT_SERVER_URL || 'http://localhost:8000', // Parlant server URL
    agentId: agent.id,
    sessionId: sessionId || undefined,
    agentName: agent.name,
    chatDescription: agent.description || `Chat with ${agent.name}`,
    float: false, // Embedded mode, not floating
    onSessionCreated: handleSessionCreated,
    components: {
      header: renderHeader,
    },
    classNames: {
      chatboxWrapper: 'h-full flex flex-col',
      chatbox: 'flex-1 flex flex-col',
      messagesArea: 'flex-1 overflow-y-auto p-4 space-y-4',
      agentMessage: 'bg-gray-100 p-3 rounded-lg max-w-3xl',
      customerMessage: 'bg-blue-500 text-white p-3 rounded-lg max-w-3xl ml-auto',
      textarea: 'flex-1 resize-none border-0 outline-0 p-3',
      bottomLine: 'text-xs text-gray-500 text-center p-2',
    },
  }

  // Show loading state while connecting
  if (!session) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <div className='mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2' />
          <p className='text-gray-500'>Authenticating...</p>
        </div>
      </div>
    )
  }

  // Show connection error if Socket.io fails
  if (connectionError) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='mx-auto max-w-md p-6 text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
            <svg
              className='h-6 w-6 text-red-500'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='mb-2 font-semibold text-gray-900 text-lg'>Connection Error</h3>
          <p className='mb-4 text-gray-600'>{connectionError}</p>
          <button
            onClick={() => window.location.reload()}
            className='rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600'
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='h-full bg-white'>
      {/* Import the CSS for parlant-chat-react */}
      <link rel='stylesheet' href='/node_modules/parlant-chat-react/dist/parlant-chat-react.css' />

      {/* Render the Parlant chat interface */}
      <Chatbox {...chatProps} />
    </div>
  )
}
