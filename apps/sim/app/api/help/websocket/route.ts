/**
 * Help System WebSocket API - Real-time help updates and notifications
 *
 * Real-time WebSocket functionality for help system:
 * - Live help content updates and notifications
 * - Real-time collaborative help features
 * - Instant feedback and interaction updates
 * - Live help session management
 * - Real-time analytics and monitoring
 * - User presence and activity tracking
 * - Push notifications for help system events
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { type NextRequest, NextResponse } from 'next/server'
import { WebSocket } from 'ws'
import { getSession } from '@/lib/auth'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('HelpWebSocketAPI')

// ========================
// WEBSOCKET TYPES
// ========================

interface WebSocketMessage {
  type: string
  payload: any
  requestId?: string
  timestamp: number
}

interface ConnectedClient {
  id: string
  ws: WebSocket
  userId?: string
  sessionId: string
  subscriptions: Set<string>
  lastActivity: number
  context: {
    component?: string
    page?: string
    userLevel?: string
  }
}

interface HelpSession {
  id: string
  userId?: string
  startTime: number
  lastActivity: number
  contentViewed: string[]
  searchQueries: string[]
  interactions: any[]
  context: any
}

// ========================
// WEBSOCKET MANAGER
// ========================

class HelpWebSocketManager {
  private clients = new Map<string, ConnectedClient>()
  private sessions = new Map<string, HelpSession>()
  private subscriptions = new Map<string, Set<string>>() // subscription -> client IDs
  private heartbeatInterval?: NodeJS.Timeout
  private sessionCleanupInterval?: NodeJS.Timeout

  constructor() {
    this.startHeartbeat()
    this.startSessionCleanup()
  }

  async handleConnection(ws: WebSocket, request: Request): Promise<void> {
    const clientId = crypto.randomUUID()
    const sessionId = this.extractSessionId(request) || crypto.randomUUID()

    logger.info('New WebSocket connection', { clientId, sessionId })

    // Create client record
    const client: ConnectedClient = {
      id: clientId,
      ws,
      sessionId,
      subscriptions: new Set(),
      lastActivity: Date.now(),
      context: {},
    }

    // Try to get user from session
    try {
      const session = await getSession()
      if (session?.user) {
        client.userId = session.user.email
      }
    } catch (error) {
      logger.warn('Failed to get user session for WebSocket', { clientId, error })
    }

    this.clients.set(clientId, client)

    // Create or update help session
    this.updateHelpSession(client)

    // Set up message handling
    ws.on('message', (data) => {
      this.handleMessage(clientId, data)
    })

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(clientId)
    })

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', { clientId, error })
      this.handleDisconnection(clientId)
    })

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      payload: {
        clientId,
        sessionId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    })

    // Track connection analytics
    if (client.userId) {
      await helpAnalytics.trackHelpInteraction(
        'websocket_connection',
        sessionId,
        'connect',
        'websocket',
        { clientId },
        client.userId
      )
    }
  }

  private async handleMessage(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastActivity = Date.now()

    try {
      const message: WebSocketMessage = JSON.parse(data.toString())
      logger.debug('WebSocket message received', { clientId, type: message.type })

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(client, message)
          break

        case 'unsubscribe':
          await this.handleUnsubscribe(client, message)
          break

        case 'help_view':
          await this.handleHelpView(client, message)
          break

        case 'search_query':
          await this.handleSearchQuery(client, message)
          break

        case 'feedback_submit':
          await this.handleFeedbackSubmit(client, message)
          break

        case 'context_update':
          await this.handleContextUpdate(client, message)
          break

        case 'ping':
          await this.handlePing(client, message)
          break

        default:
          logger.warn('Unknown WebSocket message type', { clientId, type: message.type })
          this.sendToClient(clientId, {
            type: 'error',
            payload: { error: 'Unknown message type', type: message.type },
            requestId: message.requestId,
            timestamp: Date.now(),
          })
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { clientId, error })
      this.sendToClient(clientId, {
        type: 'error',
        payload: { error: 'Invalid message format' },
        timestamp: Date.now(),
      })
    }
  }

  private async handleSubscribe(client: ConnectedClient, message: WebSocketMessage): Promise<void> {
    const { subscription } = message.payload

    if (!subscription) {
      this.sendError(client.id, 'Subscription type required', message.requestId)
      return
    }

    // Add to client subscriptions
    client.subscriptions.add(subscription)

    // Add to global subscription mapping
    if (!this.subscriptions.has(subscription)) {
      this.subscriptions.set(subscription, new Set())
    }
    this.subscriptions.get(subscription)!.add(client.id)

    logger.info('Client subscribed', {
      clientId: client.id,
      subscription,
      userId: client.userId?.substring(0, 8),
    })

    this.sendToClient(client.id, {
      type: 'subscribed',
      payload: { subscription },
      requestId: message.requestId,
      timestamp: Date.now(),
    })

    // Send initial data for certain subscriptions
    await this.sendInitialSubscriptionData(client, subscription)
  }

  private async handleUnsubscribe(
    client: ConnectedClient,
    message: WebSocketMessage
  ): Promise<void> {
    const { subscription } = message.payload

    if (!subscription) {
      this.sendError(client.id, 'Subscription type required', message.requestId)
      return
    }

    // Remove from client subscriptions
    client.subscriptions.delete(subscription)

    // Remove from global subscription mapping
    const subscriptionClients = this.subscriptions.get(subscription)
    if (subscriptionClients) {
      subscriptionClients.delete(client.id)
      if (subscriptionClients.size === 0) {
        this.subscriptions.delete(subscription)
      }
    }

    logger.info('Client unsubscribed', {
      clientId: client.id,
      subscription,
      userId: client.userId?.substring(0, 8),
    })

    this.sendToClient(client.id, {
      type: 'unsubscribed',
      payload: { subscription },
      requestId: message.requestId,
      timestamp: Date.now(),
    })
  }

  private async handleHelpView(client: ConnectedClient, message: WebSocketMessage): Promise<void> {
    const { contentId, context } = message.payload

    if (!contentId) {
      this.sendError(client.id, 'Content ID required', message.requestId)
      return
    }

    // Update help session
    const session = this.sessions.get(client.sessionId)
    if (session) {
      session.contentViewed.push(contentId)
      session.lastActivity = Date.now()
    }

    // Track analytics
    if (client.userId) {
      await helpAnalytics.trackHelpView(
        contentId,
        client.sessionId,
        { ...client.context, ...context },
        client.userId
      )
    }

    // Broadcast to subscribers
    this.broadcast('help_view_update', {
      contentId,
      userId: client.userId,
      sessionId: client.sessionId,
      context: { ...client.context, ...context },
      timestamp: Date.now(),
    })

    this.sendToClient(client.id, {
      type: 'help_view_tracked',
      payload: { contentId },
      requestId: message.requestId,
      timestamp: Date.now(),
    })
  }

  private async handleSearchQuery(
    client: ConnectedClient,
    message: WebSocketMessage
  ): Promise<void> {
    const { query, filters } = message.payload

    if (!query) {
      this.sendError(client.id, 'Search query required', message.requestId)
      return
    }

    // Update help session
    const session = this.sessions.get(client.sessionId)
    if (session) {
      session.searchQueries.push(query)
      session.lastActivity = Date.now()
    }

    // Track analytics
    if (client.userId) {
      await helpAnalytics.trackSearchQuery(
        query,
        client.sessionId,
        0, // Result count would be filled in by actual search
        client.userId
      )
    }

    // Broadcast to subscribers
    this.broadcast('search_query_update', {
      query,
      filters,
      userId: client.userId,
      sessionId: client.sessionId,
      timestamp: Date.now(),
    })

    this.sendToClient(client.id, {
      type: 'search_query_tracked',
      payload: { query },
      requestId: message.requestId,
      timestamp: Date.now(),
    })
  }

  private async handleFeedbackSubmit(
    client: ConnectedClient,
    message: WebSocketMessage
  ): Promise<void> {
    const { contentId, feedbackType, data } = message.payload

    if (!contentId || !feedbackType) {
      this.sendError(client.id, 'Content ID and feedback type required', message.requestId)
      return
    }

    // Track analytics
    if (client.userId) {
      await helpAnalytics.trackHelpInteraction(
        contentId,
        client.sessionId,
        'feedback_submitted',
        'websocket',
        { feedbackType, ...data },
        client.userId
      )
    }

    // Broadcast to subscribers
    this.broadcast('feedback_submitted', {
      contentId,
      feedbackType,
      data,
      userId: client.userId,
      sessionId: client.sessionId,
      timestamp: Date.now(),
    })

    this.sendToClient(client.id, {
      type: 'feedback_submit_tracked',
      payload: { contentId, feedbackType },
      requestId: message.requestId,
      timestamp: Date.now(),
    })
  }

  private async handleContextUpdate(
    client: ConnectedClient,
    message: WebSocketMessage
  ): Promise<void> {
    const { context } = message.payload

    if (!context) {
      this.sendError(client.id, 'Context data required', message.requestId)
      return
    }

    // Update client context
    client.context = { ...client.context, ...context }

    // Update help session
    const session = this.sessions.get(client.sessionId)
    if (session) {
      session.context = { ...session.context, ...context }
      session.lastActivity = Date.now()
    }

    logger.debug('Client context updated', {
      clientId: client.id,
      context: client.context,
      userId: client.userId?.substring(0, 8),
    })

    this.sendToClient(client.id, {
      type: 'context_updated',
      payload: { context: client.context },
      requestId: message.requestId,
      timestamp: Date.now(),
    })
  }

  private async handlePing(client: ConnectedClient, message: WebSocketMessage): Promise<void> {
    this.sendToClient(client.id, {
      type: 'pong',
      payload: {},
      requestId: message.requestId,
      timestamp: Date.now(),
    })
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    logger.info('WebSocket disconnection', {
      clientId,
      userId: client.userId?.substring(0, 8),
      sessionId: client.sessionId,
    })

    // Remove from all subscriptions
    for (const subscription of client.subscriptions) {
      const subscriptionClients = this.subscriptions.get(subscription)
      if (subscriptionClients) {
        subscriptionClients.delete(clientId)
        if (subscriptionClients.size === 0) {
          this.subscriptions.delete(subscription)
        }
      }
    }

    // Remove client
    this.clients.delete(clientId)

    // Update session end time
    const session = this.sessions.get(client.sessionId)
    if (session) {
      session.lastActivity = Date.now()
    }

    // Track disconnection analytics
    if (client.userId) {
      helpAnalytics.trackHelpInteraction(
        'websocket_disconnection',
        client.sessionId,
        'disconnect',
        'websocket',
        {
          clientId,
          sessionDuration: Date.now() - (session?.startTime || Date.now()),
        },
        client.userId
      )
    }
  }

  private updateHelpSession(client: ConnectedClient): void {
    let session = this.sessions.get(client.sessionId)

    if (!session) {
      session = {
        id: client.sessionId,
        userId: client.userId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        contentViewed: [],
        searchQueries: [],
        interactions: [],
        context: client.context,
      }
      this.sessions.set(client.sessionId, session)
      logger.info('New help session created', {
        sessionId: client.sessionId,
        userId: client.userId?.substring(0, 8),
      })
    } else {
      session.lastActivity = Date.now()
      if (client.userId) {
        session.userId = client.userId
      }
    }
  }

  private async sendInitialSubscriptionData(
    client: ConnectedClient,
    subscription: string
  ): Promise<void> {
    switch (subscription) {
      case 'help_system_stats':
        // Send current help system statistics
        this.sendToClient(client.id, {
          type: 'help_system_stats',
          payload: {
            activeUsers: this.clients.size,
            activeSessions: this.sessions.size,
            totalSubscriptions: Array.from(this.subscriptions.keys()).length,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        })
        break

      case 'user_activity':
        // Send user activity data if authorized
        if (client.userId) {
          const session = this.sessions.get(client.sessionId)
          if (session) {
            this.sendToClient(client.id, {
              type: 'user_activity',
              payload: {
                sessionId: client.sessionId,
                contentViewed: session.contentViewed,
                searchQueries: session.searchQueries,
                sessionDuration: Date.now() - session.startTime,
                timestamp: Date.now(),
              },
              timestamp: Date.now(),
            })
          }
        }
        break
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      client.ws.send(JSON.stringify(message))
    } catch (error) {
      logger.error('Error sending WebSocket message', { clientId, error })
      this.handleDisconnection(clientId)
    }
  }

  private sendError(clientId: string, error: string, requestId?: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      payload: { error },
      requestId,
      timestamp: Date.now(),
    })
  }

  private broadcast(type: string, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
    }

    // Send to all subscribers of this message type
    const subscribers = this.subscriptions.get(type)
    if (subscribers) {
      for (const clientId of subscribers) {
        this.sendToClient(clientId, message)
      }
    }

    logger.debug('Broadcast message sent', {
      type,
      subscriberCount: subscribers?.size || 0,
    })
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 60000 // 1 minute timeout

      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity > timeout) {
          logger.info('Client heartbeat timeout', { clientId })
          client.ws.close()
          this.handleDisconnection(clientId)
        }
      }
    }, 30000) // Check every 30 seconds
  }

  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(
      () => {
        const now = Date.now()
        const timeout = 24 * 60 * 60 * 1000 // 24 hours

        for (const [sessionId, session] of this.sessions) {
          if (now - session.lastActivity > timeout) {
            logger.info('Cleaning up inactive session', { sessionId })
            this.sessions.delete(sessionId)
          }
        }
      },
      60 * 60 * 1000
    ) // Check every hour
  }

  private extractSessionId(request: Request): string | null {
    try {
      const url = new URL(request.url)
      return url.searchParams.get('sessionId')
    } catch {
      return null
    }
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeSessions: this.sessions.size,
      activeSubscriptions: this.subscriptions.size,
      subscriptionTypes: Array.from(this.subscriptions.keys()),
    }
  }
}

// ========================
// SINGLETON MANAGER
// ========================

const wsManager = new HelpWebSocketManager()

// ========================
// HTTP UPGRADE HANDLER
// ========================

export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  // Handle WebSocket upgrade
  if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    try {
      const { socket, response } = Deno.upgradeWebSocket(request)

      // Handle WebSocket connection
      socket.onopen = () => {
        wsManager.handleConnection(socket as any, request)
      }

      return response
    } catch (error) {
      logger.error('WebSocket upgrade failed', { error })
      return NextResponse.json({ error: 'WebSocket upgrade failed' }, { status: 400 })
    }
  }

  // Handle stats request
  if (url.pathname.endsWith('/stats')) {
    const stats = wsManager.getStats()
    return NextResponse.json(stats)
  }

  // Default response
  return NextResponse.json({
    message: 'Help System WebSocket API',
    upgrade: 'Use WebSocket upgrade to connect',
    stats: wsManager.getStats(),
  })
}

// Handle WebSocket upgrade request
export async function PATCH(request: NextRequest) {
  return GET(request)
}
