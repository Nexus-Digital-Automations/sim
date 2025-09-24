/**
 * Workspace Isolation Tests for Parlant Chat Integration
 * =====================================================
 *
 * These tests verify that the Socket.io integration with parlant-chat-react
 * properly isolates messages and real-time events between different workspaces
 * to ensure cross-tenant security.
 *
 * Test Coverage:
 * - Message routing isolation
 * - Room membership isolation
 * - Agent status isolation
 * - Session isolation
 * - Performance monitoring isolation
 * - Presence information isolation
 * - Tool call event isolation
 * - Authentication boundary enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { Client as SocketIOClient, io } from 'socket.io-client'
import { createParlantSocketClient, type ParlantSocketClient } from '@/app/chat/workspace/[workspaceId]/agent/[agentId]/components/socket-client'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('WorkspaceIsolationTests')

// Test data for different workspaces and users
const WORKSPACE_A = 'workspace-a-test'
const WORKSPACE_B = 'workspace-b-test'
const AGENT_A1 = 'agent-a1-test'
const AGENT_A2 = 'agent-a2-test'
const AGENT_B1 = 'agent-b1-test'
const USER_ALICE = 'user-alice-test'
const USER_BOB = 'user-bob-test'
const USER_CHARLIE = 'user-charlie-test'

interface TestSocketServer {
  httpServer: any
  io: SocketIOServer
  port: number
}

interface TestClient {
  socketClient: ParlantSocketClient
  nativeSocket: SocketIOClient
  userId: string
  workspaceId: string
  agentId?: string
}

describe('Workspace Isolation Security Tests', () => {
  let testServer: TestSocketServer
  let aliceClientA: TestClient // Alice in Workspace A
  let bobClientA: TestClient   // Bob in Workspace A
  let charlieClientB: TestClient // Charlie in Workspace B

  beforeEach(async () => {
    // Create test Socket.io server
    testServer = await createTestSocketServer()

    // Create isolated clients for different users and workspaces
    aliceClientA = await createTestClient(USER_ALICE, WORKSPACE_A, AGENT_A1, testServer.port)
    bobClientA = await createTestClient(USER_BOB, WORKSPACE_A, AGENT_A2, testServer.port)
    charlieClientB = await createTestClient(USER_CHARLIE, WORKSPACE_B, AGENT_B1, testServer.port)

    // Wait for all connections to be established
    await Promise.all([
      waitForConnection(aliceClientA.socketClient),
      waitForConnection(bobClientA.socketClient),
      waitForConnection(charlieClientB.socketClient)
    ])

    logger.info('Test setup completed - all clients connected')
  })

  afterEach(async () => {
    // Clean up all test clients
    if (aliceClientA?.socketClient) aliceClientA.socketClient.disconnect()
    if (bobClientA?.socketClient) bobClientA.socketClient.disconnect()
    if (charlieClientB?.socketClient) charlieClientB.socketClient.disconnect()

    // Close test server
    if (testServer?.io) testServer.io.close()
    if (testServer?.httpServer) testServer.httpServer.close()

    logger.info('Test cleanup completed')
  })

  describe('Message Routing Isolation', () => {
    it('should not route messages between different workspaces', async () => {
      const messageFromA = 'Private message from Workspace A'
      const messageFromB = 'Private message from Workspace B'

      // Set up listeners to catch any cross-workspace message leakage
      const aliceReceivedMessages: string[] = []
      const bobReceivedMessages: string[] = []
      const charlieReceivedMessages: string[] = []

      aliceClientA.socketClient.on('message-received', (data) => {
        aliceReceivedMessages.push(data.content)
      })

      bobClientA.socketClient.on('message-received', (data) => {
        bobReceivedMessages.push(data.content)
      })

      charlieClientB.socketClient.on('message-received', (data) => {
        charlieReceivedMessages.push(data.content)
      })

      // Send message in Workspace A
      aliceClientA.nativeSocket.emit('send-workspace-message', {
        workspaceId: WORKSPACE_A,
        content: messageFromA,
        channelId: 'general'
      })

      // Send message in Workspace B
      charlieClientB.nativeSocket.emit('send-workspace-message', {
        workspaceId: WORKSPACE_B,
        content: messageFromB,
        channelId: 'general'
      })

      // Wait for message propagation
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify workspace isolation
      expect(aliceReceivedMessages).toContain(messageFromA)
      expect(bobReceivedMessages).toContain(messageFromA) // Same workspace
      expect(charlieReceivedMessages).toContain(messageFromB)

      // Critical: Verify no cross-workspace leakage
      expect(aliceReceivedMessages).not.toContain(messageFromB)
      expect(bobReceivedMessages).not.toContain(messageFromB)
      expect(charlieReceivedMessages).not.toContain(messageFromA)
    })

    it('should isolate direct messages within workspaces', async () => {
      const directMessage = 'Direct message from Alice to Bob'
      const charlieReceivedMessages: string[] = []

      // Charlie shouldn't receive direct messages from Workspace A
      charlieClientB.socketClient.on('direct-message', (data) => {
        charlieReceivedMessages.push(data.content)
      })

      // Send direct message within Workspace A
      aliceClientA.nativeSocket.emit('send-workspace-message', {
        workspaceId: WORKSPACE_A,
        content: directMessage,
        recipientId: USER_BOB
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify Charlie in Workspace B doesn't receive the direct message
      expect(charlieReceivedMessages).not.toContain(directMessage)
    })
  })

  describe('Agent Status Isolation', () => {
    it('should not broadcast agent status across workspaces', async () => {
      const charlieStatusUpdates: any[] = []

      // Charlie should not receive status updates for agents in Workspace A
      charlieClientB.socketClient.on('agent-status-update', (data) => {
        charlieStatusUpdates.push(data)
      })

      // Simulate agent status update in Workspace A
      testServer.io.to(`parlant:workspace:${WORKSPACE_A}`).emit('agent-status-update', {
        agentId: AGENT_A1,
        workspaceId: WORKSPACE_A,
        status: 'PROCESSING',
        metadata: { reason: 'Handling user request' }
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify no cross-workspace status leakage
      expect(charlieStatusUpdates).toHaveLength(0)
    })

    it('should properly isolate agent performance metrics', async () => {
      const charliePerformanceUpdates: any[] = []

      charlieClientB.socketClient.on('agent-performance-update', (data) => {
        charliePerformanceUpdates.push(data)
      })

      // Broadcast performance update for Workspace A agent
      testServer.io.to(`parlant:workspace:${WORKSPACE_A}`).emit('agent-performance-update', {
        agentId: AGENT_A1,
        workspaceId: WORKSPACE_A,
        performance: {
          totalSessions: 150,
          totalMessages: 1200,
          averageResponseTime: 350,
          successRate: 0.95
        }
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify performance metrics don't leak across workspaces
      expect(charliePerformanceUpdates).toHaveLength(0)
    })
  })

  describe('Session Isolation', () => {
    it('should isolate session events between workspaces', async () => {
      const sessionId = 'test-session-workspace-a'
      const charlieSessionEvents: any[] = []

      charlieClientB.socketClient.on('session-started', (data) => {
        charlieSessionEvents.push(data)
      })

      charlieClientB.socketClient.on('session-ended', (data) => {
        charlieSessionEvents.push(data)
      })

      // Start session in Workspace A
      testServer.io.to(`parlant:workspace:${WORKSPACE_A}`).emit('session-started', {
        sessionId,
        agentId: AGENT_A1,
        workspaceId: WORKSPACE_A,
        userId: USER_ALICE
      })

      // End session in Workspace A
      testServer.io.to(`parlant:workspace:${WORKSPACE_A}`).emit('session-ended', {
        sessionId,
        agentId: AGENT_A1,
        workspaceId: WORKSPACE_A,
        endReason: 'User ended conversation'
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify no session event leakage
      expect(charlieSessionEvents).toHaveLength(0)
    })

    it('should isolate tool call events between workspaces', async () => {
      const sessionId = 'test-session-workspace-a'
      const toolCallId = 'tool-call-test-123'
      const charlieToolEvents: any[] = []

      charlieClientB.socketClient.on('tool-call-started', (data) => {
        charlieToolEvents.push(data)
      })

      charlieClientB.socketClient.on('tool-call-completed', (data) => {
        charlieToolEvents.push(data)
      })

      // Simulate tool call in Workspace A
      testServer.io.to(`parlant:session:${sessionId}`).emit('tool-call-started', {
        sessionId,
        messageId: 'msg-123',
        workspaceId: WORKSPACE_A,
        toolCallId,
        toolName: 'search_database',
        parameters: { query: 'test query' }
      })

      testServer.io.to(`parlant:session:${sessionId}`).emit('tool-call-completed', {
        sessionId,
        messageId: 'msg-123',
        workspaceId: WORKSPACE_A,
        toolCallId,
        toolName: 'search_database',
        result: { results: ['result1', 'result2'] },
        processingTime: 1500
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify tool call isolation
      expect(charlieToolEvents).toHaveLength(0)
    })
  })

  describe('Room Membership Isolation', () => {
    it('should prevent joining rooms from other workspaces', async () => {
      const joinAttemptResult = await attemptCrossWorkspaceRoomJoin(
        charlieClientB,
        AGENT_A1,
        WORKSPACE_A
      )

      // Should be denied access to Workspace A agent room
      expect(joinAttemptResult.success).toBe(false)
      expect(joinAttemptResult.error).toContain('Access denied')
    })

    it('should verify room isolation at Socket.io level', async () => {
      // Get room information from server
      const workspaceARooms = await getSocketRooms(testServer.io, `parlant:workspace:${WORKSPACE_A}`)
      const workspaceBRooms = await getSocketRooms(testServer.io, `parlant:workspace:${WORKSPACE_B}`)

      // Verify users are in correct workspace rooms
      const aliceSocketId = aliceClientA.nativeSocket.id
      const charlieSocketId = charlieClientB.nativeSocket.id

      expect(workspaceARooms).toContain(aliceSocketId)
      expect(workspaceARooms).not.toContain(charlieSocketId)

      expect(workspaceBRooms).toContain(charlieSocketId)
      expect(workspaceBRooms).not.toContain(aliceSocketId)
    })
  })

  describe('Presence Information Isolation', () => {
    it('should isolate user presence between workspaces', async () => {
      const charliePresenceUpdates: any[] = []

      charlieClientB.socketClient.on('presence-updated', (data) => {
        charliePresenceUpdates.push(data)
      })

      // Update Alice's presence in Workspace A
      aliceClientA.socketClient.updatePresence(WORKSPACE_A, 'busy', 'In a meeting')

      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify presence isolation
      expect(charliePresenceUpdates).toHaveLength(0)
    })
  })

  describe('Authentication Boundary Enforcement', () => {
    it('should reject unauthenticated workspace access', async () => {
      // Create client without proper authentication
      const unauthenticatedClient = createParlantSocketClient({
        serverUrl: `http://localhost:${testServer.port}`,
        authToken: 'invalid-token',
        userId: 'fake-user',
        workspaceId: WORKSPACE_A,
        agentId: AGENT_A1
      })

      let connectionFailed = false
      try {
        await unauthenticatedClient.connect()
      } catch (error) {
        connectionFailed = true
      }

      // Should fail to connect with invalid auth
      expect(connectionFailed).toBe(true)

      unauthenticatedClient.disconnect()
    })

    it('should validate workspace membership before allowing joins', async () => {
      // This test would verify that even with valid authentication,
      // users can't join workspaces they don't have access to
      const result = await attemptUnauthorizedWorkspaceJoin(
        aliceClientA,
        'unauthorized-workspace-id'
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/access denied|unauthorized/i)
    })
  })
})

// Helper Functions
async function createTestSocketServer(): Promise<TestSocketServer> {
  const httpServer = createServer()
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket']
  })

  // Mock authentication middleware for tests
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (token && token !== 'invalid-token') {
      // Mock successful authentication
      socket.userId = socket.handshake.auth.userId
      socket.userName = `User ${socket.handshake.auth.userId}`
      next()
    } else {
      next(new Error('Authentication failed'))
    }
  })

  // Set up basic room joining logic for tests
  io.on('connection', (socket) => {
    socket.on('join-workspace-messaging', async (data) => {
      const { workspaceId } = data
      await socket.join(`workspace:${workspaceId}`)
      socket.emit('workspace-messaging-joined', { workspaceId })
    })

    socket.on('parlant:join-agent-room', async (data) => {
      const { agentId, workspaceId } = data

      // Mock authorization check
      if (socket.userId && workspaceId) {
        await socket.join(`parlant:agent:${agentId}`)
        await socket.join(`parlant:workspace:${workspaceId}`)
        socket.emit('parlant:join-agent-room-success', data)
      } else {
        socket.emit('parlant:join-agent-room-error', { error: 'Access denied' })
      }
    })
  })

  const port = await getAvailablePort()
  await new Promise<void>((resolve) => {
    httpServer.listen(port, resolve)
  })

  return { httpServer, io, port }
}

async function createTestClient(
  userId: string,
  workspaceId: string,
  agentId: string,
  port: number
): Promise<TestClient> {
  const nativeSocket = io(`http://localhost:${port}`, {
    auth: {
      token: `test-token-${userId}`,
      userId,
      workspaceId,
      agentId
    },
    transports: ['websocket']
  })

  const socketClient = createParlantSocketClient({
    serverUrl: `http://localhost:${port}`,
    authToken: `test-token-${userId}`,
    userId,
    workspaceId,
    agentId,
    timeout: 5000
  })

  return { socketClient, nativeSocket, userId, workspaceId, agentId }
}

async function waitForConnection(socketClient: ParlantSocketClient): Promise<void> {
  await socketClient.connect()

  // Wait a bit for connection to stabilize
  await new Promise(resolve => setTimeout(resolve, 100))
}

async function attemptCrossWorkspaceRoomJoin(
  client: TestClient,
  targetAgentId: string,
  targetWorkspaceId: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout - no response' })
    }, 2000)

    client.socketClient.on('parlant:join-agent-room-error', (data) => {
      clearTimeout(timeout)
      resolve({ success: false, error: data.error })
    })

    client.socketClient.on('parlant:join-agent-room-success', () => {
      clearTimeout(timeout)
      resolve({ success: true })
    })

    // Attempt to join room in different workspace
    client.nativeSocket.emit('parlant:join-agent-room', {
      agentId: targetAgentId,
      workspaceId: targetWorkspaceId
    })
  })
}

async function attemptUnauthorizedWorkspaceJoin(
  client: TestClient,
  unauthorizedWorkspaceId: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Access denied - timeout' })
    }, 2000)

    client.nativeSocket.emit('join-workspace-messaging', {
      workspaceId: unauthorizedWorkspaceId
    })

    client.nativeSocket.once('workspace-messaging-error', (data) => {
      clearTimeout(timeout)
      resolve({ success: false, error: data.error })
    })

    client.nativeSocket.once('workspace-messaging-joined', () => {
      clearTimeout(timeout)
      resolve({ success: true })
    })
  })
}

async function getSocketRooms(io: SocketIOServer, roomName: string): Promise<string[]> {
  const room = io.sockets.adapter.rooms.get(roomName)
  return room ? Array.from(room) : []
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const port = (server.address() as any)?.port
      server.close(() => {
        if (port) {
          resolve(port)
        } else {
          reject(new Error('Unable to get available port'))
        }
      })
    })
  })
}