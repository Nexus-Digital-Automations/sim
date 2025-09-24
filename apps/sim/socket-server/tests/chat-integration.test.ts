import { createServer } from 'http'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'
import type { Server } from 'socket.io'
import { io as Client, type Socket as ClientSocket } from 'socket.io-client'
import { createLogger } from '@/lib/logs/console/logger'
import { createSocketIOServer } from '@/socket-server/config/socket'
import {
  type ChatMessage,
  type ChatPresence,
  setupChatHandlers,
  type TypingIndicator,
} from '@/socket-server/handlers/chat'
import { type AuthenticatedSocket, authenticateSocket } from '@/socket-server/middleware/auth'
import { RoomManager } from '@/socket-server/rooms/manager'

const logger = createLogger('ChatIntegrationTest')

// Test configuration
const TEST_PORT = 3003
const TEST_URL = `http://localhost:${TEST_PORT}`

// Mock authentication middleware
jest.mock('@/socket-server/middleware/auth', () => ({
  authenticateSocket: jest.fn((socket, next) => {
    // Mock successful authentication
    socket.userId = socket.handshake.auth.userId || 'test-user-1'
    socket.userName = socket.handshake.auth.userName || 'Test User'
    next()
  }),
}))

// Mock Parlant permissions
jest.mock('@/socket-server/middleware/parlant-permissions', () => ({
  validateParlantAccess: jest.fn().mockResolvedValue({
    canAccessSession: true,
    canAccessAgent: true,
    canAccessWorkspace: true,
  }),
}))

describe('Socket.io Chat Integration', () => {
  let httpServer: any
  let serverSocket: Server
  let roomManager: RoomManager
  let clientSocket1: ClientSocket
  let clientSocket2: ClientSocket

  beforeAll(async () => {
    // Create test server
    httpServer = createServer()
    serverSocket = createSocketIOServer(httpServer)
    roomManager = new RoomManager(serverSocket)

    // Setup authentication middleware
    serverSocket.use(authenticateSocket)

    // Setup socket event handlers
    serverSocket.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Test server: Socket connected ${socket.id}`)
      setupChatHandlers(socket, roomManager)
    })

    // Start test server
    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, resolve)
    })

    logger.info(`Test server started on port ${TEST_PORT}`)
  })

  afterAll(async () => {
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(resolve)
      })
    }
    logger.info('Test server closed')
  })

  beforeEach(async () => {
    // Create test clients
    clientSocket1 = Client(TEST_URL, {
      auth: {
        userId: 'test-user-1',
        userName: 'Test User 1',
        token: 'mock-token-1',
      },
    })

    clientSocket2 = Client(TEST_URL, {
      auth: {
        userId: 'test-user-2',
        userName: 'Test User 2',
        token: 'mock-token-2',
      },
    })

    // Wait for connections
    await Promise.all([
      new Promise<void>((resolve) => clientSocket1.on('connect', resolve)),
      new Promise<void>((resolve) => clientSocket2.on('connect', resolve)),
    ])

    logger.info('Test clients connected')
  })

  afterEach(() => {
    if (clientSocket1?.connected) clientSocket1.disconnect()
    if (clientSocket2?.connected) clientSocket2.disconnect()
  })

  describe('Session Management', () => {
    test('should join chat session successfully', async () => {
      const sessionId = 'test-session-1'
      const workspaceId = 'test-workspace-1'
      const agentId = 'test-agent-1'

      const joinPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:join-session-success', resolve)
      })

      clientSocket1.emit('chat:join-session', {
        sessionId,
        workspaceId,
        agentId,
      })

      const joinResult = await joinPromise

      expect(joinResult).toMatchObject({
        sessionId,
        workspaceId,
        agentId,
        roomId: `chat:session:${sessionId}`,
        workspaceRoomId: `chat:workspace:${workspaceId}`,
      })
      expect(joinResult.presence).toMatchObject({
        sessionId,
        userId: 'test-user-1',
        userName: 'Test User 1',
        status: 'active',
      })
    })

    test('should handle join session errors', async () => {
      const errorPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:join-session-error', resolve)
      })

      // Emit with invalid data
      clientSocket1.emit('chat:join-session', {
        sessionId: '', // Invalid session ID
      })

      const errorResult = await errorPromise
      expect(errorResult.error).toBeTruthy()
    })

    test('should leave chat session successfully', async () => {
      const sessionId = 'test-session-leave'
      const workspaceId = 'test-workspace-1'

      // First join the session
      await new Promise<void>((resolve) => {
        clientSocket1.on('chat:join-session-success', () => resolve())
        clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
      })

      // Then leave
      const leavePromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:leave-session-success', resolve)
      })

      clientSocket1.emit('chat:leave-session', { sessionId })

      const leaveResult = await leavePromise
      expect(leaveResult).toMatchObject({
        sessionId,
        roomId: `chat:session:${sessionId}`,
      })
    })
  })

  describe('Real-time Messaging', () => {
    beforeEach(async () => {
      const sessionId = 'test-session-messaging'
      const workspaceId = 'test-workspace-1'

      // Both clients join the same session
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket1.on('chat:join-session-success', () => resolve())
          clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
        }),
        new Promise<void>((resolve) => {
          clientSocket2.on('chat:join-session-success', () => resolve())
          clientSocket2.emit('chat:join-session', { sessionId, workspaceId })
        }),
      ])
    })

    test('should send and receive messages', async () => {
      const testMessage: ChatMessage = {
        id: 'test-message-1',
        content: 'Hello, this is a test message!',
        type: 'user',
        timestamp: Date.now(),
        sessionId: 'test-session-messaging',
        userId: 'test-user-1',
      }

      // Setup message receivers
      const messageReceivedPromise = new Promise<ChatMessage>((resolve) => {
        clientSocket2.on('chat:message-received', resolve)
      })

      const messageSentPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:message-sent', resolve)
      })

      // Send message from client1
      clientSocket1.emit('chat:send-message', { message: testMessage })

      // Verify message sent confirmation
      const sentConfirmation = await messageSentPromise
      expect(sentConfirmation).toMatchObject({
        messageId: testMessage.id,
        sessionId: testMessage.sessionId,
      })

      // Verify message received by client2
      const receivedMessage = await messageReceivedPromise
      expect(receivedMessage).toMatchObject({
        id: testMessage.id,
        content: testMessage.content,
        type: testMessage.type,
        sessionId: testMessage.sessionId,
        userId: testMessage.userId,
      })
      expect(receivedMessage.metadata?.senderName).toBe('Test User 1')
    })

    test('should handle message validation', async () => {
      const invalidMessage: Partial<ChatMessage> = {
        content: '', // Empty content
        sessionId: 'test-session-messaging',
      }

      const errorPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:send-message-error', resolve)
      })

      clientSocket1.emit('chat:send-message', { message: invalidMessage })

      const error = await errorPromise
      expect(error.error).toBe('Invalid message content')
    })
  })

  describe('Typing Indicators', () => {
    beforeEach(async () => {
      const sessionId = 'test-session-typing'
      const workspaceId = 'test-workspace-1'

      // Both clients join the same session
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket1.on('chat:join-session-success', () => resolve())
          clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
        }),
        new Promise<void>((resolve) => {
          clientSocket2.on('chat:join-session-success', () => resolve())
          clientSocket2.emit('chat:join-session', { sessionId, workspaceId })
        }),
      ])
    })

    test('should send and receive typing indicators', async () => {
      const sessionId = 'test-session-typing'

      const typingPromise = new Promise<TypingIndicator>((resolve) => {
        clientSocket2.on('chat:typing-indicator', resolve)
      })

      // Client1 starts typing
      clientSocket1.emit('chat:typing', { sessionId, isTyping: true })

      const typingIndicator = await typingPromise
      expect(typingIndicator).toMatchObject({
        sessionId,
        userId: 'test-user-1',
        isTyping: true,
      })
    })

    test('should stop typing indicators', async () => {
      const sessionId = 'test-session-typing'

      const typingEvents: TypingIndicator[] = []
      clientSocket2.on('chat:typing-indicator', (indicator) => {
        typingEvents.push(indicator)
      })

      // Start typing
      clientSocket1.emit('chat:typing', { sessionId, isTyping: true })
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Stop typing
      clientSocket1.emit('chat:typing', { sessionId, isTyping: false })
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(typingEvents).toHaveLength(2)
      expect(typingEvents[0].isTyping).toBe(true)
      expect(typingEvents[1].isTyping).toBe(false)
    })
  })

  describe('Presence Management', () => {
    beforeEach(async () => {
      const sessionId = 'test-session-presence'
      const workspaceId = 'test-workspace-1'

      // Both clients join the same session
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket1.on('chat:join-session-success', () => resolve())
          clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
        }),
        new Promise<void>((resolve) => {
          clientSocket2.on('chat:join-session-success', () => resolve())
          clientSocket2.emit('chat:join-session', { sessionId, workspaceId })
        }),
      ])
    })

    test('should broadcast user joined events', async () => {
      const sessionId = 'test-session-presence-new'
      const workspaceId = 'test-workspace-1'

      // Client1 is already connected, wait for Client2 to join
      const userJoinedPromise = new Promise<ChatPresence>((resolve) => {
        clientSocket1.on('chat:user-joined', resolve)
      })

      // Client2 joins
      clientSocket2.emit('chat:join-session', { sessionId, workspaceId })

      const joinedUser = await userJoinedPromise
      expect(joinedUser).toMatchObject({
        sessionId,
        userId: 'test-user-2',
        userName: 'Test User 2',
        status: 'active',
      })
    })

    test('should update presence status', async () => {
      const sessionId = 'test-session-presence'

      const presenceUpdatePromise = new Promise<ChatPresence>((resolve) => {
        clientSocket2.on('chat:presence-updated', resolve)
      })

      // Client1 updates presence to idle
      clientSocket1.emit('chat:update-presence', { sessionId, status: 'idle' })

      const presenceUpdate = await presenceUpdatePromise
      expect(presenceUpdate).toMatchObject({
        sessionId,
        userId: 'test-user-1',
        status: 'idle',
      })
    })

    test('should broadcast user left events', async () => {
      const sessionId = 'test-session-presence'

      const userLeftPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:user-left', resolve)
      })

      // Client2 leaves
      clientSocket2.emit('chat:leave-session', { sessionId })

      const leftUser = await userLeftPromise
      expect(leftUser).toMatchObject({
        sessionId,
        userId: 'test-user-2',
      })
    })
  })

  describe('Workspace Isolation', () => {
    test('should isolate messages by workspace', async () => {
      const sessionId1 = 'test-session-workspace-1'
      const sessionId2 = 'test-session-workspace-2'
      const workspaceId1 = 'workspace-1'
      const workspaceId2 = 'workspace-2'

      // Join different workspaces
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket1.on('chat:join-session-success', () => resolve())
          clientSocket1.emit('chat:join-session', {
            sessionId: sessionId1,
            workspaceId: workspaceId1,
          })
        }),
        new Promise<void>((resolve) => {
          clientSocket2.on('chat:join-session-success', () => resolve())
          clientSocket2.emit('chat:join-session', {
            sessionId: sessionId2,
            workspaceId: workspaceId2,
          })
        }),
      ])

      // Setup message listener on client2 (should not receive message from client1)
      let messageReceived = false
      clientSocket2.on('chat:message-received', () => {
        messageReceived = true
      })

      // Send message from client1
      const testMessage: ChatMessage = {
        id: 'test-workspace-isolation',
        content: 'This should not cross workspaces',
        type: 'user',
        timestamp: Date.now(),
        sessionId: sessionId1,
        userId: 'test-user-1',
      }

      clientSocket1.emit('chat:send-message', { message: testMessage })

      // Wait a bit to see if message arrives (it shouldn't)
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(messageReceived).toBe(false)
    })
  })

  describe('Error Handling and Rate Limiting', () => {
    test('should handle rate limiting', async () => {
      const sessionId = 'test-session-rate-limit'
      const workspaceId = 'test-workspace-1'

      // Join session
      await new Promise<void>((resolve) => {
        clientSocket1.on('chat:join-session-success', () => resolve())
        clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
      })

      // Send many messages rapidly to trigger rate limiting
      const promises = []
      for (let i = 0; i < 50; i++) {
        const message: ChatMessage = {
          id: `rate-limit-message-${i}`,
          content: `Message ${i}`,
          type: 'user',
          timestamp: Date.now(),
          sessionId,
          userId: 'test-user-1',
        }
        promises.push(
          new Promise<void>((resolve) => {
            clientSocket1.emit('chat:send-message', { message })
            resolve()
          })
        )
      }

      await Promise.all(promises)

      // Expect to receive rate limit error
      const rateLimitPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:send-message-error', resolve)
      })

      // Send one more message
      const finalMessage: ChatMessage = {
        id: 'final-message',
        content: 'This should be rate limited',
        type: 'user',
        timestamp: Date.now(),
        sessionId,
        userId: 'test-user-1',
      }

      clientSocket1.emit('chat:send-message', { message: finalMessage })

      const rateLimitError = await rateLimitPromise
      expect(rateLimitError.error).toBe('Rate limit exceeded')
    })

    test('should handle disconnections gracefully', async () => {
      const sessionId = 'test-session-disconnect'
      const workspaceId = 'test-workspace-1'

      // Both clients join session
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket1.on('chat:join-session-success', () => resolve())
          clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
        }),
        new Promise<void>((resolve) => {
          clientSocket2.on('chat:join-session-success', () => resolve())
          clientSocket2.emit('chat:join-session', { sessionId, workspaceId })
        }),
      ])

      // Setup user left listener
      const userLeftPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:user-left', resolve)
      })

      // Disconnect client2
      clientSocket2.disconnect()

      const leftUser = await userLeftPromise
      expect(leftUser.userId).toBe('test-user-2')
    })
  })

  describe('Message History', () => {
    test('should request and receive message history', async () => {
      const sessionId = 'test-session-history'
      const workspaceId = 'test-workspace-1'

      // Join session
      await new Promise<void>((resolve) => {
        clientSocket1.on('chat:join-session-success', () => resolve())
        clientSocket1.emit('chat:join-session', { sessionId, workspaceId })
      })

      // Setup history response listener
      const historyPromise = new Promise<any>((resolve) => {
        clientSocket1.on('chat:history-response', resolve)
      })

      // Request history
      clientSocket1.emit('chat:request-history', {
        sessionId,
        limit: 10,
        offset: 0,
      })

      const historyResponse = await historyPromise
      expect(historyResponse).toMatchObject({
        sessionId,
        messages: expect.any(Array),
        limit: 10,
        offset: 0,
        hasMore: false,
      })
    })
  })
})
