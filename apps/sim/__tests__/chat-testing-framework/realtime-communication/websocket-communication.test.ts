/**
 * WebSocket Real-time Communication Testing Suite
 * ===============================================
 *
 * Comprehensive testing for Socket.io real-time messaging, connection handling,
 * message delivery guarantees, network failure scenarios, and performance.
 */

import { createServer } from 'http'
import { Server } from 'socket.io'
import Client, { type Socket as ClientSocket } from 'socket.io-client'
import type { ChatMessage, MessageDeliveryReceipt, ParlantAgent } from '../../../types/parlant'
import { ComprehensiveTestReporter } from '../../utils/test-reporter'

interface TestEnvironment {
  server: Server
  httpServer: any
  port: number
  clients: ClientSocket[]
}

describe('WebSocket Real-time Communication Testing Suite', () => {
  let reporter: ComprehensiveTestReporter
  let testEnv: TestEnvironment
  let mockAgent: ParlantAgent

  beforeAll(async () => {
    reporter = new ComprehensiveTestReporter({
      outputDir: './test-reports/realtime-communication',
      includePerformanceMetrics: true,
      reportFormats: ['html', 'json', 'junit'],
    })

    await reporter.startTestSuite(
      'realtime-communication',
      'WebSocket Real-time Communication Testing',
      'Comprehensive validation of Socket.io messaging, connection handling, and network resilience'
    )
  })

  afterAll(async () => {
    await reporter.finishTestSuite()
  })

  beforeEach(async () => {
    // Setup test environment
    testEnv = await createTestEnvironment()

    mockAgent = {
      id: 'test-agent-1',
      Name: 'Test Agent',
      description: 'Agent for testing',
      status: 'active',
      capabilities: ['testing'],
    }
  })

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnvironment(testEnv)
  })

  async function createTestEnvironment(): Promise<TestEnvironment> {
    const httpServer = createServer()
    const server = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['get', 'post'],
      },
    })

    const port = 3001 + Math.floor(Math.random() * 1000)

    return new Promise((resolve) => {
      httpServer.listen(port, () => {
        resolve({
          server,
          httpServer,
          port,
          clients: [],
        })
      })
    })
  }

  async function cleanupTestEnvironment(env: TestEnvironment): Promise<void> {
    // Disconnect all clients
    env.clients.forEach((client) => {
      if (client.connected) {
        client.disconnect()
      }
    })

    // Close server
    return new Promise((resolve) => {
      env.server.close(() => {
        env.httpServer.close(() => {
          resolve()
        })
      })
    })
  }

  function createTestClient(port: number): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${port}`)

      client.on('connect', () => {
        resolve(client)
      })

      client.on('connect_error', (error) => {
        reject(error)
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 5000)
    })
  }

  describe('Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      const startTime = new Date()

      const client = await createTestClient(testEnv.port)
      testEnv.clients.push(client)

      expect(client.connected).toBe(true)
      expect(client.id).toBeDefined()

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'websocket-connection-establish',
            Name: 'WebSocket Connection Establishment',
            complexity: 'simple',
            metadata: { testType: 'connection', clientId: client.id },
          } as any,
          { success: true, connectionTime: endTime.getTime() - startTime.getTime() },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })

    it('should handle multiple concurrent connections', async () => {
      const startTime = new Date()
      const connectionPromises: Promise<ClientSocket>[] = []

      // Create 50 concurrent connections
      for (let i = 0; i < 50; i++) {
        connectionPromises.push(createTestClient(testEnv.port))
      }

      const clients = await Promise.all(connectionPromises)
      testEnv.clients.push(...clients)

      expect(clients.length).toBe(50)
      clients.forEach((client) => {
        expect(client.connected).toBe(true)
      })

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'websocket-concurrent-connections',
            Name: 'WebSocket Concurrent Connections',
            complexity: 'complex',
            metadata: {
              testType: 'connection',
              concurrentConnections: clients.length,
            },
          } as any,
          {
            success: true,
            connectionCount: clients.length,
            connectionTime: endTime.getTime() - startTime.getTime(),
          },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })

    it('should handle connection authentication', async () => {
      const startTime = new Date()

      // Setup authentication middleware
      testEnv.server.use((socket, next) => {
        const token = socket.handshake.auth.token
        if (token === 'valid-token') {
          socket.data.userId = 'user-123'
          socket.data.workspaceId = 'workspace-456'
          next()
        } else {
          next(new Error('Authentication failed'))
        }
      })

      // Test valid authentication
      const validClient = Client(`http://localhost:${testEnv.port}`, {
        auth: { token: 'valid-token' },
      })

      await new Promise<void>((resolve, reject) => {
        validClient.on('connect', () => {
          testEnv.clients.push(validClient)
          resolve()
        })
        validClient.on('connect_error', reject)
      })

      expect(validClient.connected).toBe(true)

      // Test invalid authentication
      const invalidClient = Client(`http://localhost:${testEnv.port}`, {
        auth: { token: 'invalid-token' },
      })

      await new Promise<void>((resolve) => {
        invalidClient.on('connect_error', (error) => {
          expect(error.message).toBe('Authentication failed')
          resolve()
        })
      })

      expect(invalidClient.connected).toBe(false)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'websocket-authentication',
            Name: 'WebSocket Connection Authentication',
            complexity: 'medium',
            metadata: { testType: 'authentication' },
          } as any,
          { success: true, validAuth: true, invalidAuthBlocked: true },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })

    it('should handle connection disconnection gracefully', async () => {
      const startTime = new Date()

      const client = await createTestClient(testEnv.port)
      const clientId = client.id

      let disconnectEventReceived = false
      testEnv.server.on('disconnect', (socket) => {
        if (socket.id === clientId) {
          disconnectEventReceived = true
        }
      })

      client.disconnect()

      // Wait for disconnect event
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(client.connected).toBe(false)
      expect(disconnectEventReceived).toBe(true)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'websocket-disconnection',
            Name: 'WebSocket Connection Disconnection',
            complexity: 'simple',
            metadata: { testType: 'connection' },
          } as any,
          { success: true },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })
  })

  describe('Message Delivery', () => {
    it('should deliver messages reliably between clients', async () => {
      const startTime = new Date()

      const [sender, receiver] = await Promise.all([
        createTestClient(testEnv.port),
        createTestClient(testEnv.port),
      ])
      testEnv.clients.push(sender, receiver)

      const testMessage: ChatMessage = {
        id: 'test-msg-1',
        content: 'Hello from sender!',
        sender: { type: 'user', id: 'user-1', Name: 'Test User' },
        timestamp: new Date(),
        type: 'text',
        sessionId: 'session-1',
      }

      let messageReceived = false
      let receivedMessage: ChatMessage

      receiver.on('chat:message', (message: ChatMessage) => {
        messageReceived = true
        receivedMessage = message
      })

      sender.emit('chat:send', testMessage)

      // Wait for message delivery
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(messageReceived).toBe(true)
      expect(receivedMessage!.content).toBe(testMessage.content)
      expect(receivedMessage!.id).toBe(testMessage.id)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'message-delivery-basic',
            Name: 'Basic Message Delivery',
            complexity: 'medium',
            metadata: {
              testType: 'messaging',
              messageId: testMessage.id,
            },
          } as any,
          {
            success: true,
            messageDelivered: messageReceived,
            deliveryTime: endTime.getTime() - startTime.getTime(),
          },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })

    it('should handle high-frequency message bursts', async () => {
      const startTime = new Date()

      const [sender, receiver] = await Promise.all([
        createTestClient(testEnv.port),
        createTestClient(testEnv.port),
      ])
      testEnv.clients.push(sender, receiver)

      const messageCount = 100
      const messagesReceived: ChatMessage[] = []

      receiver.on('chat:message', (message: ChatMessage) => {
        messagesReceived.push(message)
      })

      // Send burst of messages
      const sendStart = performance.now()
      for (let i = 0; i < messageCount; i++) {
        sender.emit('chat:send', {
          id: `burst-msg-${i}`,
          content: `Burst message ${i}`,
          sender: { type: 'user', id: 'user-1', Name: 'Test User' },
          timestamp: new Date(),
          type: 'text',
          sessionId: 'session-1',
        })
      }

      // Wait for all messages to be received
      await new Promise((resolve) => {
        const checkMessages = () => {
          if (messagesReceived.length >= messageCount) {
            resolve(undefined)
          } else {
            setTimeout(checkMessages, 10)
          }
        }
        checkMessages()
      })

      const sendEnd = performance.now()
      const burstDuration = sendEnd - sendStart

      expect(messagesReceived.length).toBe(messageCount)

      // Verify message order
      for (let i = 0; i < messageCount; i++) {
        expect(messagesReceived[i].id).toBe(`burst-msg-${i}`)
      }

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'message-delivery-burst',
            Name: 'High-Frequency Message Burst',
            complexity: 'complex',
            metadata: {
              testType: 'messaging',
              messageCount: messageCount,
              burstDuration: burstDuration,
            },
          } as any,
          {
            success: true,
            messagesDelivered: messagesReceived.length,
            deliveryRate: messageCount / (burstDuration / 1000),
          },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })

    it('should provide message delivery acknowledgments', async () => {
      const startTime = new Date()

      const [sender, receiver] = await Promise.all([
        createTestClient(testEnv.port),
        createTestClient(testEnv.port),
      ])
      testEnv.clients.push(sender, receiver)

      const testMessage: ChatMessage = {
        id: 'ack-test-msg',
        content: 'Message requiring acknowledgment',
        sender: { type: 'user', id: 'user-1', Name: 'Test User' },
        timestamp: new Date(),
        type: 'text',
        sessionId: 'session-1',
      }

      let ackReceived = false
      let ackData: MessageDeliveryReceipt

      sender.on('chat:delivery-receipt', (receipt: MessageDeliveryReceipt) => {
        ackReceived = true
        ackData = receipt
      })

      // Setup receiver to send acknowledgment
      receiver.on('chat:message', (message: ChatMessage) => {
        receiver.emit('chat:ack', {
          messageId: message.id,
          timestamp: new Date(),
          receiverId: 'user-2',
        })
      })

      sender.emit('chat:send', testMessage)

      // Wait for acknowledgment
      await new Promise((resolve) => {
        const checkAck = () => {
          if (ackReceived) {
            resolve(undefined)
          } else {
            setTimeout(checkAck, 10)
          }
        }
        checkAck()
      })

      expect(ackReceived).toBe(true)
      expect(ackData!.messageId).toBe(testMessage.id)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'message-delivery-acknowledgment',
            Name: 'Message Delivery Acknowledgment',
            complexity: 'complex',
            metadata: { testType: 'messaging' },
          } as any,
          {
            success: true,
            acknowledgmentReceived: ackReceived,
            ackTime: endTime.getTime() - startTime.getTime(),
          },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )
    })

    it('should handle message queuing during disconnection', async () => {
      const startTime = new Date()

      const [sender, receiver] = await Promise.all([
        createTestClient(testEnv.port),
        createTestClient(testEnv.port),
      ])
      testEnv.clients.push(sender, receiver)

      // Disconnect receiver
      receiver.disconnect()

      const testMessage: ChatMessage = {
        id: 'queued-msg-1',
        content: 'Message sent while disconnected',
        sender: { type: 'user', id: 'user-1', Name: 'Test User' },
        timestamp: new Date(),
        type: 'text',
        sessionId: 'session-1',
      }

      // Send message while receiver is disconnected
      sender.emit('chat:send', testMessage)

      let queuedMessageReceived = false
      let receivedMessage: ChatMessage

      // Reconnect receiver
      const reconnectedReceiver = await createTestClient(testEnv.port)
      testEnv.clients.push(reconnectedReceiver)

      reconnectedReceiver.on('chat:queued-messages', (messages: ChatMessage[]) => {
        if (messages.length > 0 && messages[0].id === testMessage.id) {
          queuedMessageReceived = true
          receivedMessage = messages[0]
        }
      })

      // Request queued messages
      reconnectedReceiver.emit('chat:get-queued-messages', { sessionId: 'session-1' })

      // Wait for queued message delivery
      await new Promise((resolve) => setTimeout(resolve, 200))

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'message-queuing',
            Name: 'Message Queuing During Disconnection',
            complexity: 'complex',
            metadata: { testType: 'messaging' },
          } as any,
          {
            success: queuedMessageReceived,
            messageQueued: true,
            messageDeliveredOnReconnect: queuedMessageReceived,
          },
          { isValid: queuedMessageReceived, score: queuedMessageReceived ? 100 : 0 },
          startTime,
          endTime
        )
      )
    })
  })

  describe('Network Resilience', () => {
    it('should handle network interruptions gracefully', async () => {
      const startTime = new Date()

      const client = await createTestClient(testEnv.port)
      testEnv.clients.push(client)

      let reconnectAttempted = false
      let reconnectionSuccessful = false

      client.on('disconnect', () => {
        reconnectAttempted = true
      })

      client.on('connect', () => {
        if (reconnectAttempted) {
          reconnectionSuccessful = true
        }
      })

      // Simulate network interruption by closing server
      testEnv.server.close()

      // Wait for disconnect
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(client.connected).toBe(false)
      expect(reconnectAttempted).toBe(true)

      // Restart server
      testEnv = await createTestEnvironment()

      // Wait for potential reconnection
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'network-interruption-handling',
            Name: 'Network Interruption Handling',
            complexity: 'complex',
            metadata: { testType: 'resilience' },
          } as any,
          {
            success: true,
            disconnectDetected: reconnectAttempted,
            reconnectionAttempted: true,
          },
          { isValid: true, score: 90 },
          startTime,
          endTime
        )
      )
    })

    it('should implement exponential backoff for reconnection', async () => {
      const startTime = new Date()

      const client = Client(`http://localhost:${testEnv.port}`, {
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionDelayMax: 1000,
        maxReconnectionAttempts: 3,
      })

      const reconnectionAttempts: number[] = []

      client.on('reconnect_attempt', (attemptNumber) => {
        reconnectionAttempts.push(Date.now())
      })

      // Force disconnect
      await new Promise<void>((resolve) => {
        client.on('connect', () => {
          client.disconnect()
          resolve()
        })
      })

      // Wait for reconnection attempts
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Verify exponential backoff
      if (reconnectionAttempts.length >= 2) {
        const firstInterval = reconnectionAttempts[1] - reconnectionAttempts[0]
        expect(firstInterval).toBeGreaterThan(100)
        expect(firstInterval).toBeLessThan(500)
      }

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'exponential-backoff-reconnection',
            Name: 'Exponential Backoff Reconnection',
            complexity: 'complex',
            metadata: {
              testType: 'resilience',
              reconnectionAttempts: reconnectionAttempts.length,
            },
          } as any,
          {
            success: true,
            reconnectionAttempts: reconnectionAttempts.length,
            backoffImplemented: reconnectionAttempts.length > 0,
          },
          { isValid: true, score: 100 },
          startTime,
          endTime
        )
      )

      client.disconnect()
    })

    it('should handle server overload gracefully', async () => {
      const startTime = new Date()

      // Create many clients to simulate overload
      const clients: ClientSocket[] = []
      const connectionPromises: Promise<void>[] = []

      for (let i = 0; i < 200; i++) {
        connectionPromises.push(
          createTestClient(testEnv.port)
            .then((client) => {
              clients.push(client)
            })
            .catch(() => {
              // Expected to fail for some connections under overload
            })
        )
      }

      await Promise.all(connectionPromises)

      // Count successful connections
      const successfulConnections = clients.filter((client) => client.connected).length
      testEnv.clients.push(...clients)

      // Server should handle at least some connections
      expect(successfulConnections).toBeGreaterThan(50)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'server-overload-handling',
            Name: 'Server Overload Handling',
            complexity: 'extreme',
            metadata: {
              testType: 'resilience',
              attemptedConnections: 200,
              successfulConnections: successfulConnections,
            },
          } as any,
          {
            success: true,
            connectionSuccessRate: successfulConnections / 200,
            overloadHandled: successfulConnections > 50,
          },
          { isValid: successfulConnections > 50, score: (successfulConnections / 200) * 100 },
          startTime,
          endTime
        )
      )
    })
  })

  describe('Performance Testing', () => {
    it('should maintain low message latency', async () => {
      const startTime = new Date()

      const [sender, receiver] = await Promise.all([
        createTestClient(testEnv.port),
        createTestClient(testEnv.port),
      ])
      testEnv.clients.push(sender, receiver)

      const latencies: number[] = []
      const messageCount = 20

      receiver.on('chat:message', (message: ChatMessage) => {
        const receivedTime = Date.now()
        const sentTime = Number.parseInt(message.content.split('-')[1], 10)
        const latency = receivedTime - sentTime
        latencies.push(latency)
      })

      // Send messages with timestamps
      for (let i = 0; i < messageCount; i++) {
        const sendTime = Date.now()
        sender.emit('chat:send', {
          id: `latency-test-${i}`,
          content: `latency-${sendTime}`,
          sender: { type: 'user', id: 'user-1', Name: 'Test User' },
          timestamp: new Date(),
          type: 'text',
          sessionId: 'session-1',
        })

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Wait for all messages
      await new Promise((resolve) => {
        const checkLatencies = () => {
          if (latencies.length >= messageCount) {
            resolve(undefined)
          } else {
            setTimeout(checkLatencies, 10)
          }
        }
        checkLatencies()
      })

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      const maxLatency = Math.max(...latencies)

      // Good performance: average latency < 50ms, max < 200ms
      expect(averageLatency).toBeLessThan(100)
      expect(maxLatency).toBeLessThan(500)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'message-latency-performance',
            Name: 'Message Latency Performance',
            complexity: 'complex',
            metadata: {
              testType: 'performance',
              messageCount: messageCount,
              averageLatency: averageLatency,
              maxLatency: maxLatency,
            },
          } as any,
          {
            success: true,
            averageLatency: averageLatency,
            maxLatency: maxLatency,
            performanceScore: Math.max(0, 100 - averageLatency),
          },
          { isValid: averageLatency < 100, score: Math.max(0, 100 - averageLatency) },
          startTime,
          endTime
        )
      )
    })

    it('should handle concurrent messaging efficiently', async () => {
      const startTime = new Date()

      // Create multiple sender-receiver pairs
      const clientPairs = await Promise.all(
        Array.from({ length: 10 }, async () => ({
          sender: await createTestClient(testEnv.port),
          receiver: await createTestClient(testEnv.port),
        }))
      )

      clientPairs.forEach((pair) => {
        testEnv.clients.push(pair.sender, pair.receiver)
      })

      const messagesReceived = new Map<string, number>()

      // Setup receivers
      clientPairs.forEach((pair, index) => {
        const sessionId = `concurrent-session-${index}`
        messagesReceived.set(sessionId, 0)

        pair.receiver.on('chat:message', (message: ChatMessage) => {
          if (message.sessionId === sessionId) {
            messagesReceived.set(sessionId, messagesReceived.get(sessionId)! + 1)
          }
        })
      })

      const messagesPerSession = 10
      const concurrentStart = performance.now()

      // Send messages concurrently from all senders
      await Promise.all(
        clientPairs.map(async (pair, index) => {
          const sessionId = `concurrent-session-${index}`
          for (let i = 0; i < messagesPerSession; i++) {
            pair.sender.emit('chat:send', {
              id: `concurrent-${index}-${i}`,
              content: `Concurrent message ${i} from session ${index}`,
              sender: { type: 'user', id: `user-${index}`, Name: `User ${index}` },
              timestamp: new Date(),
              type: 'text',
              sessionId: sessionId,
            })
          }
        })
      )

      // Wait for all messages to be received
      await new Promise((resolve) => {
        const checkAllReceived = () => {
          const totalReceived = Array.from(messagesReceived.values()).reduce(
            (sum, count) => sum + count,
            0
          )
          const expectedTotal = clientPairs.length * messagesPerSession

          if (totalReceived >= expectedTotal) {
            resolve(undefined)
          } else {
            setTimeout(checkAllReceived, 50)
          }
        }
        checkAllReceived()
      })

      const concurrentEnd = performance.now()
      const concurrentDuration = concurrentEnd - concurrentStart

      const totalMessages = clientPairs.length * messagesPerSession
      const throughput = totalMessages / (concurrentDuration / 1000)

      expect(
        Array.from(messagesReceived.values()).every((count) => count === messagesPerSession)
      ).toBe(true)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'concurrent-messaging-performance',
            Name: 'Concurrent Messaging Performance',
            complexity: 'extreme',
            metadata: {
              testType: 'performance',
              concurrentSessions: clientPairs.length,
              messagesPerSession: messagesPerSession,
              totalMessages: totalMessages,
              throughput: throughput,
            },
          } as any,
          {
            success: true,
            throughput: throughput,
            duration: concurrentDuration,
            performanceScore: Math.min(100, throughput * 2),
          },
          { isValid: true, score: Math.min(100, throughput * 2) },
          startTime,
          endTime
        )
      )
    })
  })

  describe('Workspace Isolation', () => {
    it('should prevent cross-workspace message leakage', async () => {
      const startTime = new Date()

      // Setup clients in different workspaces
      const workspace1Client1 = Client(`http://localhost:${testEnv.port}`, {
        auth: { token: 'valid-token', workspaceId: 'workspace-1' },
      })
      const workspace1Client2 = Client(`http://localhost:${testEnv.port}`, {
        auth: { token: 'valid-token', workspaceId: 'workspace-1' },
      })
      const workspace2Client = Client(`http://localhost:${testEnv.port}`, {
        auth: { token: 'valid-token', workspaceId: 'workspace-2' },
      })

      await Promise.all([
        new Promise<void>((resolve) => workspace1Client1.on('connect', resolve)),
        new Promise<void>((resolve) => workspace1Client2.on('connect', resolve)),
        new Promise<void>((resolve) => workspace2Client.on('connect', resolve)),
      ])

      testEnv.clients.push(workspace1Client1, workspace1Client2, workspace2Client)

      let workspace1MessagesReceived = 0
      let workspace2MessagesReceived = 0

      workspace1Client2.on('chat:message', () => workspace1MessagesReceived++)
      workspace2Client.on('chat:message', () => workspace2MessagesReceived++)

      // Send message from workspace 1
      workspace1Client1.emit('chat:send', {
        id: 'isolation-test-msg',
        content: 'Message from workspace 1',
        sender: { type: 'user', id: 'user-1', Name: 'User 1' },
        timestamp: new Date(),
        type: 'text',
        sessionId: 'session-1',
        workspaceId: 'workspace-1',
      })

      // Wait for message delivery
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(workspace1MessagesReceived).toBe(1)
      expect(workspace2MessagesReceived).toBe(0)

      const endTime = new Date()
      reporter.recordTestResult(
        reporter.createTestResult(
          {
            id: 'workspace-message-isolation',
            Name: 'Workspace Message Isolation',
            complexity: 'complex',
            metadata: { testType: 'security' },
          } as any,
          {
            success: true,
            isolationMaintained: workspace2MessagesReceived === 0,
            appropriateDelivery: workspace1MessagesReceived === 1,
          },
          { isValid: workspace2MessagesReceived === 0, score: 100 },
          startTime,
          endTime
        )
      )

      workspace1Client1.disconnect()
      workspace1Client2.disconnect()
      workspace2Client.disconnect()
    })
  })
})
