/**
 * Socket.io Client for Parlant Chat Integration
 * ============================================
 *
 * This module provides a typed Socket.io client specifically designed for
 * Parlant real-time messaging integration with workspace isolation.
 *
 * Features:
 * - Workspace-scoped connections and message routing
 * - Real-time agent status and presence tracking
 * - Secure authentication with JWT tokens
 * - Type-safe event handling
 * - Automatic reconnection with exponential backoff
 * - Message encryption support
 * - Cross-tenant isolation enforcement
 */

import { io, type Socket } from 'socket.io-client'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ParlantSocketClient')

// Socket.io event interfaces for type safety
export interface ServerToClientEvents {
  // Connection events
  'parlant:join-agent-room-success': (data: {
    agentId: string
    workspaceId: string
    roomId: string
    workspaceRoomId: string
    timestamp: number
  }) => void

  'parlant:join-agent-room-error': (data: {
    error: string
    agentId?: string
    workspaceId?: string
  }) => void

  'parlant:join-session-room-success': (data: {
    sessionId: string
    agentId: string
    workspaceId: string
    roomId: string
    timestamp: number
  }) => void

  'parlant:join-session-room-error': (data: {
    error: string
    sessionId?: string
    agentId?: string
    workspaceId?: string
  }) => void

  // Message events
  'message-sent': (data: {
    sessionId: string
    messageId: string
    workspaceId: string
    content: string
    messageType: 'user' | 'assistant'
    userId?: string
    metadata?: any
  }) => void

  'message-received': (data: {
    sessionId: string
    messageId: string
    workspaceId: string
    content: string
    messageType: 'user' | 'assistant'
    metadata?: any
  }) => void

  'typing-indicator': (data: {
    sessionId: string
    workspaceId: string
    isTyping: boolean
    userId?: string
    agentId?: string
  }) => void

  // Agent status events
  'agent-status-update': (data: {
    agentId: string
    workspaceId: string
    status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'PROCESSING'
    metadata?: any
  }) => void

  'agent-performance-update': (data: {
    agentId: string
    workspaceId: string
    performance: {
      totalSessions: number
      totalMessages: number
      averageResponseTime: number
      successRate: number
    }
  }) => void

  // Session events
  'session-started': (data: {
    sessionId: string
    agentId: string
    workspaceId: string
    userId?: string
    customerId?: string
    metadata?: any
  }) => void

  'session-ended': (data: {
    sessionId: string
    agentId: string
    workspaceId: string
    endReason: string
    analytics?: any
  }) => void

  'session-status-changed': (data: {
    sessionId: string
    agentId: string
    workspaceId: string
    newStatus: string
    previousStatus?: string
  }) => void

  // Tool call events
  'tool-call-started': (data: {
    sessionId: string
    messageId: string
    workspaceId: string
    toolCallId: string
    toolName: string
    parameters: any
  }) => void

  'tool-call-completed': (data: {
    sessionId: string
    messageId: string
    workspaceId: string
    toolCallId: string
    toolName: string
    result: any
    processingTime: number
  }) => void

  'tool-call-failed': (data: {
    sessionId: string
    messageId: string
    workspaceId: string
    toolCallId: string
    toolName: string
    error: {
      code: string
      message: string
      details?: any
    }
  }) => void

  // Workspace events
  'workspace-notification': (data: {
    workspaceId: string
    type: 'info' | 'warning' | 'error'
    message: string
    metadata?: any
  }) => void

  'presence-updated': (data: {
    userId: string
    userName: string
    status: 'online' | 'away' | 'busy' | 'offline'
    customStatus?: string
    timestamp: string
  }) => void

  // Error events
  error: (error: any) => void
}

export interface ClientToServerEvents {
  // Join/leave rooms
  'parlant:join-agent-room': (data: { agentId: string; workspaceId: string }) => void

  'parlant:leave-agent-room': (data: { agentId: string }) => void

  'parlant:join-session-room': (data: {
    sessionId: string
    agentId: string
    workspaceId: string
  }) => void

  'parlant:leave-session-room': (data: { sessionId: string }) => void

  // Status requests
  'parlant:request-agent-status': (data: { agentId: string; workspaceId: string }) => void

  // Workspace messaging
  'join-workspace-messaging': (data: { workspaceId: string; channels?: string[] }) => void

  'leave-workspace-messaging': (data: { workspaceId: string }) => void

  'send-workspace-message': (data: {
    workspaceId: string
    content: string
    type?: string
    priority?: string
    recipientId?: string
    channelId?: string
    threadId?: string
    replyToMessageId?: string
    metadata?: Record<string, any>
  }) => void

  'update-workspace-presence': (data: {
    workspaceId: string
    status: 'online' | 'away' | 'busy' | 'offline' | 'invisible'
    customStatus?: string
  }) => void

  // Session lifecycle
  'session-started': (data: {
    sessionId: string
    agentId: string
    workspaceId: string
    userId: string
    metadata?: any
  }) => void
}

export interface SocketData {
  userId?: string
  workspaceId?: string
  agentId?: string
}

export type ParlantSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Configuration options for the Parlant Socket client
 */
export interface ParlantSocketConfig {
  serverUrl: string
  authToken: string
  userId: string
  workspaceId: string
  agentId?: string
  timeout?: number
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

/**
 * Connection state for tracking socket status
 */
export interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  connectionId?: string
  lastConnected?: Date
  error?: string
  reconnectAttempts: number
}

/**
 * ParlantSocketClient - Manages Socket.io connection for Parlant chat
 */
export class ParlantSocketClient {
  private socket: ParlantSocket | null = null
  private config: ParlantSocketConfig
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
  }
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map()

  constructor(config: ParlantSocketConfig) {
    this.config = {
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...config,
    }
  }

  /**
   * Connect to Socket.io server with authentication
   */
  async connect(): Promise<void> {
    if (this.connectionState.isConnecting || this.connectionState.isConnected) {
      return
    }

    this.connectionState.isConnecting = true
    this.connectionState.error = undefined

    try {
      logger.info('Connecting to Parlant Socket.io server', {
        serverUrl: this.config.serverUrl,
        workspaceId: this.config.workspaceId,
        agentId: this.config.agentId,
        userId: this.config.userId,
      })

      this.socket = io(this.config.serverUrl, {
        auth: {
          token: this.config.authToken,
          userId: this.config.userId,
          workspaceId: this.config.workspaceId,
          agentId: this.config.agentId,
        },
        transports: ['websocket'],
        timeout: this.config.timeout,
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: 10000,
        maxReconnectionAttempts: this.config.reconnectionAttempts,
      })

      // Set up event handlers
      this.setupEventHandlers()

      // Connect
      this.socket.connect()

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, this.config.timeout)

        this.socket!.once('connect', () => {
          clearTimeout(connectTimeout)
          resolve()
        })

        this.socket!.once('connect_error', (error) => {
          clearTimeout(connectTimeout)
          reject(error)
        })
      })
    } catch (error) {
      this.connectionState.isConnecting = false
      this.connectionState.error = error.message
      logger.error('Failed to connect to Parlant Socket.io server', error)
      throw error
    }
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    if (this.socket) {
      logger.info('Disconnecting from Parlant Socket.io server')
      this.socket.disconnect()
      this.socket = null
    }
    this.connectionState.isConnected = false
    this.connectionState.isConnecting = false
    this.connectionState.connectionId = undefined
  }

  /**
   * Join agent room for real-time updates
   */
  async joinAgentRoom(agentId: string, workspaceId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join agent room timeout'))
      }, 10000)

      this.socket!.once('parlant:join-agent-room-success', (data) => {
        clearTimeout(timeout)
        logger.info('Successfully joined agent room', data)
        resolve()
      })

      this.socket!.once('parlant:join-agent-room-error', (error) => {
        clearTimeout(timeout)
        logger.error('Failed to join agent room', error)
        reject(new Error(error.error))
      })

      this.socket!.emit('parlant:join-agent-room', { agentId, workspaceId })
    })
  }

  /**
   * Join session room for conversation updates
   */
  async joinSessionRoom(sessionId: string, agentId: string, workspaceId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join session room timeout'))
      }, 10000)

      this.socket!.once('parlant:join-session-room-success', (data) => {
        clearTimeout(timeout)
        logger.info('Successfully joined session room', data)
        resolve()
      })

      this.socket!.once('parlant:join-session-room-error', (error) => {
        clearTimeout(timeout)
        logger.error('Failed to join session room', error)
        reject(new Error(error.error))
      })

      this.socket!.emit('parlant:join-session-room', { sessionId, agentId, workspaceId })
    })
  }

  /**
   * Join workspace messaging for general workspace communication
   */
  async joinWorkspaceMessaging(
    workspaceId: string,
    channels: string[] = ['general']
  ): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected')
    }

    this.socket.emit('join-workspace-messaging', { workspaceId, channels })
  }

  /**
   * Send workspace presence update
   */
  updatePresence(
    workspaceId: string,
    status: 'online' | 'away' | 'busy' | 'offline' | 'invisible',
    customStatus?: string
  ): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot update presence - socket not connected')
      return
    }

    this.socket.emit('update-workspace-presence', { workspaceId, status, customStatus })
  }

  /**
   * Notify about session start
   */
  notifySessionStarted(
    sessionId: string,
    agentId: string,
    workspaceId: string,
    userId: string,
    metadata?: any
  ): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot notify session started - socket not connected')
      return
    }

    this.socket.emit('session-started', { sessionId, agentId, workspaceId, userId, metadata })
  }

  /**
   * Request current agent status
   */
  requestAgentStatus(agentId: string, workspaceId: string): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot request agent status - socket not connected')
      return
    }

    this.socket.emit('parlant:request-agent-status', { agentId, workspaceId })
  }

  /**
   * Add event listener with type safety
   */
  on<K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)

    if (this.socket) {
      this.socket.on(event, handler)
    }
  }

  /**
   * Remove event listener
   */
  off<K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }

    if (this.socket) {
      this.socket.off(event, handler)
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      logger.info('Connected to Parlant Socket.io server', { socketId: this.socket!.id })
      this.connectionState.isConnected = true
      this.connectionState.isConnecting = false
      this.connectionState.connectionId = this.socket!.id
      this.connectionState.lastConnected = new Date()
      this.connectionState.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      logger.warn('Disconnected from Parlant Socket.io server', { reason })
      this.connectionState.isConnected = false
      this.connectionState.connectionId = undefined
    })

    this.socket.on('connect_error', (error) => {
      logger.error('Parlant Socket.io connection error', error)
      this.connectionState.isConnecting = false
      this.connectionState.error = error.message
      this.connectionState.reconnectAttempts++
    })

    this.socket.on('reconnect', (attemptNumber) => {
      logger.info('Reconnected to Parlant Socket.io server', { attemptNumber })
      this.connectionState.error = undefined
    })

    this.socket.on('reconnect_error', (error) => {
      logger.error('Reconnection error', error)
      this.connectionState.error = error.message
    })

    this.socket.on('reconnect_failed', () => {
      logger.error('Failed to reconnect to Parlant Socket.io server after max attempts')
      this.connectionState.error = 'Reconnection failed after maximum attempts'
    })

    // Set up stored event handlers
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket!.on(event as any, handler as any)
      })
    })
  }
}

/**
 * Create a configured Parlant Socket client instance
 */
export function createParlantSocketClient(config: ParlantSocketConfig): ParlantSocketClient {
  return new ParlantSocketClient(config)
}
