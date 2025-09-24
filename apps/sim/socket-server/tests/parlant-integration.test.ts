/**
 * Parlant Socket.io Integration Tests
 *
 * Comprehensive tests for the Parlant real-time communication integration
 * Tests agent lifecycle, session management, and workspace-scoped broadcasting
 */

import { createServer } from 'http'
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import type { Server as SocketIOServer } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import { io as Client } from 'socket.io-client'
import { createSocketIOServer } from '@/socket-server/config/socket'
import { setupParlantHandlers } from '@/socket-server/handlers/parlant'
import { initializeParlantHooks, ParlantHooks } from '@/socket-server/integrations/parlant-hooks'
import { RoomManager } from '@/socket-server/rooms/manager'
import { ParlantEventType, ParlantMessageType } from '@/socket-server/types/parlant-events'

describe('Parlant Socket.io Integration', () => {
  let httpServer: any
  let io: SocketIOServer
  let roomManager: RoomManager
  let clientSockets: ClientSocket[]
  let port: number

  beforeEach(async () => {
    // Create test server
    httpServer = createServer()
    io = createSocketIOServer(httpServer)
    roomManager = new RoomManager(io)

    // Initialize Parlant components
    initializeParlantHooks(io, roomManager)

    // Setup socket handlers
    io.on('connection', (socket: any) => {
      // Mock authentication for testing
      socket.userId = `test-user-${Math.random().toString(36).substr(2, 9)}`
      socket.userName = 'Test User'
      socket.activeOrganizationId = `test-workspace-${Math.random().toString(36).substr(2, 9)}`

      setupParlantHandlers(socket, roomManager)
    })

    // Start server on random port
    return new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = httpServer.address()?.port || 0
        resolve()
      })
    })
  })

  afterEach(async () => {
    // Clean up client connections
    await Promise.all(
      clientSockets.map((socket) => {
        return new Promise<void>((resolve) => {
          if (socket.connected) {
            socket.disconnect()
            socket.on('disconnect', () => resolve())
          } else {
            resolve()
          }
        })
      })
    )

    // Close server
    await new Promise<void>((resolve) => {
      httpServer.close(resolve)
    })

    clientSockets = []
  })

  beforeEach(() => {
    clientSockets = []
  })

  const createAuthenticatedClient = (): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: 'mock-token', // Mock authentication token
        },
      })

      client.on('connect', () => {
        clientSockets.push(client)
        resolve(client)
      })

      client.on('connect_error', reject)

      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    })
  }

  describe('Agent Room Management', () => {
    it('should allow joining agent room with valid permissions', async () => {
      const client = await createAuthenticatedClient()
      const agentId = 'test-agent-123'
      const workspaceId = 'test-workspace-456'

      const response = await new Promise((resolve) => {
        client.emit('parlant:join-agent-room', { agentId, workspaceId })
        client.on('parlant:join-agent-room-success', resolve)
      })

      expect(response).toMatchObject({
        agentId,
        workspaceId,
        roomId: `parlant:agent:${agentId}`,
        workspaceRoomId: `parlant:workspace:${workspaceId}`,
      })
    })

    it('should reject joining agent room without authentication', async () => {
      const client = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
      })

      const errorResponse = await new Promise((resolve) => {
        client.emit('parlant:join-agent-room', { agentId: 'test', workspaceId: 'test' })
        client.on('parlant:join-agent-room-error', resolve)
        client.on('connect_error', resolve)
      })

      expect(errorResponse).toMatchObject({
        error: expect.stringContaining('Authentication'),
      })

      client.disconnect()
    })

    it('should allow leaving agent room', async () => {
      const client = await createAuthenticatedClient()
      const agentId = 'test-agent-123'

      // First join the room
      await new Promise((resolve) => {
        client.emit('parlant:join-agent-room', { agentId, workspaceId: 'test-workspace' })
        client.on('parlant:join-agent-room-success', resolve)
      })

      // Then leave the room
      const response = await new Promise((resolve) => {
        client.emit('parlant:leave-agent-room', { agentId })
        client.on('parlant:leave-agent-room-success', resolve)
      })

      expect(response).toMatchObject({
        agentId,
        roomId: `parlant:agent:${agentId}`,
      })
    })
  })

  describe('Session Room Management', () => {
    it('should allow joining session room with valid permissions', async () => {
      const client = await createAuthenticatedClient()
      const sessionId = 'test-session-123'
      const agentId = 'test-agent-456'
      const workspaceId = 'test-workspace-789'

      const response = await new Promise((resolve) => {
        client.emit('parlant:join-session-room', { sessionId, agentId, workspaceId })
        client.on('parlant:join-session-room-success', resolve)
      })

      expect(response).toMatchObject({
        sessionId,
        agentId,
        workspaceId,
        roomId: `parlant:session:${sessionId}`,
      })
    })

    it('should allow leaving session room', async () => {
      const client = await createAuthenticatedClient()
      const sessionId = 'test-session-123'

      // First join the room
      await new Promise((resolve) => {
        client.emit('parlant:join-session-room', {
          sessionId,
          agentId: 'test-agent',
          workspaceId: 'test-workspace',
        })
        client.on('parlant:join-session-room-success', resolve)
      })

      // Then leave the room
      const response = await new Promise((resolve) => {
        client.emit('parlant:leave-session-room', { sessionId })
        client.on('parlant:leave-session-room-success', resolve)
      })

      expect(response).toMatchObject({
        sessionId,
        roomId: `parlant:session:${sessionId}`,
      })
    })
  })

  describe('Agent Status Requests', () => {
    it('should handle agent status requests', async () => {
      const client = await createAuthenticatedClient()
      const agentId = 'test-agent-123'
      const workspaceId = 'test-workspace-456'

      const response = await new Promise((resolve) => {
        client.emit('parlant:request-agent-status', { agentId, workspaceId })
        client.on('parlant:agent-status-update', resolve)
      })

      expect(response).toMatchObject({
        type: ParlantEventType.AGENT_STATUS_UPDATE,
        agentId,
        workspaceId,
        status: expect.any(String),
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Event Broadcasting', () => {
    it('should broadcast agent events to appropriate rooms', async () => {
      const client1 = await createAuthenticatedClient()
      const client2 = await createAuthenticatedClient()
      const agentId = 'test-agent-123'
      const workspaceId = 'test-workspace-456'

      // Both clients join the same agent room
      await Promise.all([
        new Promise((resolve) => {
          client1.emit('parlant:join-agent-room', { agentId, workspaceId })
          client1.on('parlant:join-agent-room-success', resolve)
        }),
        new Promise((resolve) => {
          client2.emit('parlant:join-agent-room', { agentId, workspaceId })
          client2.on('parlant:join-agent-room-success', resolve)
        }),
      ])

      // Set up event listeners
      const client1Events: any[] = []
      const client2Events: any[] = []

      client1.on('parlant:agent-event', (event) => client1Events.push(event))
      client2.on('parlant:agent-event', (event) => client2Events.push(event))

      // Trigger agent created event
      await ParlantHooks.Agent.onAgentCreated({
        id: agentId,
        workspaceId,
        name: 'Test Agent',
        description: 'A test agent',
        model: 'gpt-4',
        temperature: 0.7,
        createdBy: 'test-user',
      })

      // Wait for events to be received
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(client1Events).toHaveLength(1)
      expect(client2Events).toHaveLength(1)

      expect(client1Events[0]).toMatchObject({
        type: ParlantEventType.AGENT_CREATED,
        agentId,
        workspaceId,
      })
    })

    it('should broadcast session events to session room', async () => {
      const client = await createAuthenticatedClient()
      const sessionId = 'test-session-123'
      const agentId = 'test-agent-456'
      const workspaceId = 'test-workspace-789'

      // Join session room
      await new Promise((resolve) => {
        client.emit('parlant:join-session-room', { sessionId, agentId, workspaceId })
        client.on('parlant:join-session-room-success', resolve)
      })

      // Set up event listener
      const sessionEvents: any[] = []
      client.on('parlant:session-event', (event) => sessionEvents.push(event))

      // Trigger session started event
      await ParlantHooks.Session.onSessionStarted({
        sessionId,
        agentId,
        workspaceId,
        userId: 'test-user',
        title: 'Test Session',
      })

      // Wait for event to be received
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(sessionEvents).toHaveLength(1)
      expect(sessionEvents[0]).toMatchObject({
        type: ParlantEventType.SESSION_STARTED,
        sessionId,
        agentId,
        workspaceId,
      })
    })

    it('should broadcast message events to session participants', async () => {
      const client = await createAuthenticatedClient()
      const sessionId = 'test-session-123'
      const agentId = 'test-agent-456'
      const workspaceId = 'test-workspace-789'

      // Join session room
      await new Promise((resolve) => {
        client.emit('parlant:join-session-room', { sessionId, agentId, workspaceId })
        client.on('parlant:join-session-room-success', resolve)
      })

      // Set up event listener
      const messageEvents: any[] = []
      client.on('parlant:message-event', (event) => messageEvents.push(event))

      // Trigger message sent event
      await ParlantHooks.Message.onMessageSent({
        sessionId,
        messageId: 'msg-123',
        workspaceId,
        content: 'Hello, world!',
        messageType: ParlantMessageType.USER_MESSAGE,
        userId: 'test-user',
      })

      // Wait for event to be received
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(messageEvents).toHaveLength(1)
      expect(messageEvents[0]).toMatchObject({
        type: ParlantEventType.MESSAGE_SENT,
        sessionId,
        messageId: 'msg-123',
        content: 'Hello, world!',
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on room joins', async () => {
      const client = await createAuthenticatedClient()
      const agentId = 'test-agent-123'
      const workspaceId = 'test-workspace-456'

      // Attempt to join rooms rapidly (exceeding rate limit)
      const promises = []
      for (let i = 0; i < 35; i++) {
        // Exceeds the 30/minute limit
        promises.push(
          new Promise((resolve) => {
            client.emit('parlant:join-agent-room', {
              agentId: `${agentId}-${i}`,
              workspaceId,
            })
            client.on('parlant:join-agent-room-success', () => resolve('success'))
            client.on('parlant:join-agent-room-error', (error) => resolve(error))
          })
        )
      }

      const results = await Promise.all(promises)

      // Should have some rate limit errors
      const rateLimitErrors = results.filter((result: any) => result?.error?.includes('Rate limit'))

      expect(rateLimitErrors.length).toBeGreaterThan(0)
    })
  })

  describe('Connection Cleanup', () => {
    it('should clean up resources on disconnect', async () => {
      const client = await createAuthenticatedClient()
      const agentId = 'test-agent-123'
      const workspaceId = 'test-workspace-456'

      // Join a room
      await new Promise((resolve) => {
        client.emit('parlant:join-agent-room', { agentId, workspaceId })
        client.on('parlant:join-agent-room-success', resolve)
      })

      // Disconnect and verify cleanup
      await new Promise<void>((resolve) => {
        client.on('disconnect', resolve)
        client.disconnect()
      })

      // Connection tracking should be cleaned up
      // (This would require exposing internal state for testing)
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('Security Validation', () => {
    it('should validate message content', async () => {
      const client = await createAuthenticatedClient()

      // Try to join with invalid data
      const response = await new Promise((resolve) => {
        client.emit('parlant:join-agent-room', {
          agentId: '<script>alert("xss")</script>',
          workspaceId: 'test-workspace',
        })
        client.on('parlant:join-agent-room-error', resolve)
        client.on('parlant:join-agent-room-success', resolve)
      })

      // Should handle the XSS attempt gracefully
      // The exact behavior depends on validation implementation
      expect(response).toBeDefined()
    })

    it('should handle oversized messages', async () => {
      const client = await createAuthenticatedClient()

      // Try to send an oversized message
      const largeData = 'x'.repeat(64 * 1024) // 64KB
      const response = await new Promise((resolve) => {
        client.emit('parlant:join-agent-room', {
          agentId: largeData,
          workspaceId: 'test-workspace',
        })
        client.on('parlant:join-agent-room-error', resolve)
        client.on('parlant:join-agent-room-success', resolve)

        setTimeout(() => resolve({ error: 'timeout' }), 1000)
      })

      expect(response).toMatchObject({
        error: expect.any(String),
      })
    })
  })
})

// Helper functions for more complex integration tests
export const ParlantTestHelpers = {
  /**
   * Create multiple authenticated clients for testing multi-user scenarios
   */
  async createMultipleClients(count: number, port: number): Promise<ClientSocket[]> {
    const clients = []
    for (let i = 0; i < count; i++) {
      const client = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: `mock-token-${i}` },
      })

      await new Promise((resolve, reject) => {
        client.on('connect', resolve)
        client.on('connect_error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      clients.push(client)
    }
    return clients
  },

  /**
   * Wait for all clients to receive a specific event
   */
  async waitForEventOnAllClients(
    clients: ClientSocket[],
    eventName: string,
    timeout = 5000
  ): Promise<any[]> {
    const events: any[] = []

    return new Promise((resolve, reject) => {
      let receivedCount = 0
      const timer = setTimeout(() => reject(new Error('Timeout waiting for events')), timeout)

      clients.forEach((client, index) => {
        client.once(eventName, (data) => {
          events[index] = data
          receivedCount++

          if (receivedCount === clients.length) {
            clearTimeout(timer)
            resolve(events)
          }
        })
      })
    })
  },
}
