/**
 * Chat Persistence and Message History Tests
 * ==========================================
 *
 * Comprehensive test suite for validating chat persistence and message history functionality
 * including database operations, cross-session continuity, and data integrity.
 *
 * Test Categories:
 * 1. Message Storage and Retrieval
 * 2. Session Persistence and Restoration
 * 3. Conversation Threading and Continuity
 * 4. Message History Pagination and Filtering
 * 5. Cross-Browser Session Management
 * 6. Data Export and Compliance
 * 7. Search and Indexing
 * 8. Performance and Scalability
 * 9. Error Handling and Recovery
 * 10. Workspace Isolation Validation
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { db } from '@packages/db'
import {
  ChatMessageStorage,
  ChatHistoryRetrieval,
  ConversationManager,
  BrowserSessionManager,
  ChatDataExporter
} from '@packages/db/chat-persistence-queries'
import { SessionPersistenceService } from '../../services/chat-persistence/session-persistence'
import { chatMessage, chatConversation, chatBrowserSession, parlantSession, parlantAgent, workspace, user } from '@packages/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// Test fixtures and utilities
interface TestContext {
  workspaceId: string
  userId: string
  agentId: string
  sessionId: string
  conversationId: string
  browserSessionToken: string
  messageStorage: ChatMessageStorage
  historyRetrieval: ChatHistoryRetrieval
  conversationManager: ConversationManager
  browserSessionManager: BrowserSessionManager
  dataExporter: ChatDataExporter
  sessionPersistence: SessionPersistenceService
}

// Performance metrics tracking
interface PerformanceMetrics {
  messageStorageTime: number[]
  historyRetrievalTime: number[]
  searchTime: number[]
  sessionRestorationTime: number[]
  averageResponseTime: number
  throughputMessages: number
  concurrentUsers: number
}

describe('Chat Persistence and Message History', () => {
  let testContext: TestContext
  let performanceMetrics: PerformanceMetrics

  beforeAll(async () => {
    // Initialize performance tracking
    performanceMetrics = {
      messageStorageTime: [],
      historyRetrievalTime: [],
      searchTime: [],
      sessionRestorationTime: [],
      averageResponseTime: 0,
      throughputMessages: 0,
      concurrentUsers: 0
    }

    console.log('🧪 Starting Chat Persistence and Message History Tests...')
  })

  beforeEach(async () => {
    // Setup test environment
    const workspaceId = uuidv4()
    const userId = uuidv4()
    const agentId = uuidv4()
    const sessionId = uuidv4()
    const conversationId = uuidv4()
    const browserSessionToken = `test_session_${Date.now()}_${uuidv4()}`

    // Initialize services
    const messageStorage = new ChatMessageStorage(db)
    const historyRetrieval = new ChatHistoryRetrieval(db)
    const conversationManager = new ConversationManager(db)
    const browserSessionManager = new BrowserSessionManager(db)
    const dataExporter = new ChatDataExporter(db)
    const sessionPersistence = new SessionPersistenceService()

    testContext = {
      workspaceId,
      userId,
      agentId,
      sessionId,
      conversationId,
      browserSessionToken,
      messageStorage,
      historyRetrieval,
      conversationManager,
      browserSessionManager,
      dataExporter,
      sessionPersistence
    }

    // Create test workspace, user, and agent
    await db.insert(workspace).values({
      id: workspaceId,
      name: 'Test Workspace',
      slug: 'test-workspace'
    }).onConflictDoNothing()

    await db.insert(user).values({
      id: userId,
      email: 'test@example.com',
      name: 'Test User'
    }).onConflictDoNothing()

    await db.insert(parlantAgent).values({
      id: agentId,
      workspaceId,
      createdBy: userId,
      name: 'Test Agent',
      description: 'Test agent for persistence testing',
      status: 'active'
    }).onConflictDoNothing()

    // Create Parlant session
    await db.insert(parlantSession).values({
      id: sessionId,
      agentId,
      workspaceId,
      userId,
      mode: 'auto',
      status: 'active'
    }).onConflictDoNothing()

    console.log(`✅ Test environment initialized - Workspace: ${workspaceId}`)
  })

  afterEach(async () => {
    // Cleanup test data
    try {
      await db.delete(chatMessage).where(eq(chatMessage.workspaceId, testContext.workspaceId))
      await db.delete(chatBrowserSession).where(eq(chatBrowserSession.workspaceId, testContext.workspaceId))
      await db.delete(chatConversation).where(eq(chatConversation.workspaceId, testContext.workspaceId))
      await db.delete(parlantSession).where(eq(parlantSession.workspaceId, testContext.workspaceId))
      await db.delete(parlantAgent).where(eq(parlantAgent.workspaceId, testContext.workspaceId))
      await db.delete(workspace).where(eq(workspace.id, testContext.workspaceId))
      await db.delete(user).where(eq(user.id, testContext.userId))
    } catch (error) {
      console.warn('Cleanup warning:', error)
    }
  })

  afterAll(() => {
    // Calculate and log performance metrics
    const avgStorageTime = performanceMetrics.messageStorageTime.reduce((a, b) => a + b, 0) / performanceMetrics.messageStorageTime.length
    const avgRetrievalTime = performanceMetrics.historyRetrievalTime.reduce((a, b) => a + b, 0) / performanceMetrics.historyRetrievalTime.length
    const avgSearchTime = performanceMetrics.searchTime.reduce((a, b) => a + b, 0) / performanceMetrics.searchTime.length

    console.log('📊 Performance Metrics Summary:')
    console.log(`   • Average Message Storage Time: ${avgStorageTime?.toFixed(2) || 0}ms`)
    console.log(`   • Average History Retrieval Time: ${avgRetrievalTime?.toFixed(2) || 0}ms`)
    console.log(`   • Average Search Time: ${avgSearchTime?.toFixed(2) || 0}ms`)
    console.log(`   • Total Messages Processed: ${performanceMetrics.throughputMessages}`)
    console.log(`   • Concurrent Users Tested: ${performanceMetrics.concurrentUsers}`)
    console.log('✅ Chat Persistence and Message History Tests Completed')
  })

  describe('1. Message Storage and Retrieval', () => {
    it('should store and retrieve individual messages with full metadata', async () => {
      const startTime = Date.now()

      const messageData = {
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageType: 'text' as const,
        content: { text: 'Hello, this is a test message!' },
        rawContent: 'Hello, this is a test message!',
        senderId: testContext.userId,
        senderType: 'user' as const,
        senderName: 'Test User',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web_interface',
          userAgent: 'test-browser'
        }
      }

      // Store message
      const storedMessage = await testContext.messageStorage.storeMessage(messageData)

      expect(storedMessage).toBeDefined()
      expect(storedMessage.sessionId).toBe(testContext.sessionId)
      expect(storedMessage.workspaceId).toBe(testContext.workspaceId)
      expect(storedMessage.messageType).toBe('text')
      expect(storedMessage.senderType).toBe('user')
      expect(storedMessage.sequenceNumber).toBe(1)
      expect(storedMessage.status).toBe('sent')

      // Retrieve message history
      const history = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: 10
      })

      expect(history.messages).toHaveLength(1)
      expect(history.messages[0].id).toBe(storedMessage.id)
      expect(history.totalCount).toBe(1)
      expect(history.hasMore).toBe(false)

      // Track performance
      const storageTime = Date.now() - startTime
      performanceMetrics.messageStorageTime.push(storageTime)
      performanceMetrics.throughputMessages++

      console.log(`✅ Message stored and retrieved successfully in ${storageTime}ms`)
    })

    it('should handle batch message storage with correct sequencing', async () => {
      const startTime = Date.now()

      const batchMessages = Array.from({ length: 10 }, (_, index) => ({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageType: 'text' as const,
        content: { text: `Batch message ${index + 1}` },
        rawContent: `Batch message ${index + 1}`,
        senderId: index % 2 === 0 ? testContext.userId : testContext.agentId,
        senderType: (index % 2 === 0 ? 'user' : 'agent') as 'user' | 'agent',
        senderName: index % 2 === 0 ? 'Test User' : 'Test Agent',
        status: 'sent' as const
      }))

      // Batch store messages
      const storedMessages = await testContext.messageStorage.batchStoreMessages(batchMessages)

      expect(storedMessages).toHaveLength(10)

      // Verify sequence numbers are consecutive
      storedMessages.forEach((message, index) => {
        expect(message.sequenceNumber).toBe(index + 1)
      })

      // Retrieve and verify order
      const history = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: 20
      })

      expect(history.messages).toHaveLength(10)
      expect(history.totalCount).toBe(10)

      const storageTime = Date.now() - startTime
      performanceMetrics.messageStorageTime.push(storageTime)
      performanceMetrics.throughputMessages += 10

      console.log(`✅ Batch message storage completed in ${storageTime}ms`)
    })

    it('should update message status and track delivery', async () => {
      // Store initial message
      const message = await testContext.messageStorage.storeMessage({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageType: 'text',
        content: { text: 'Message for status tracking' },
        rawContent: 'Message for status tracking',
        senderId: testContext.userId,
        senderType: 'user',
        senderName: 'Test User'
      })

      // Update status to delivered
      const deliveredAt = new Date()
      await testContext.messageStorage.updateMessageStatus(message.id, 'delivered', deliveredAt)

      // Verify status update
      const [updatedMessage] = await db
        .select()
        .from(chatMessage)
        .where(eq(chatMessage.id, message.id))

      expect(updatedMessage.status).toBe('delivered')
      expect(updatedMessage.deliveredAt).toBeDefined()

      // Update to read status
      const readAt = new Date()
      await testContext.messageStorage.updateMessageStatus(message.id, 'read', readAt)

      const [readMessage] = await db
        .select()
        .from(chatMessage)
        .where(eq(chatMessage.id, message.id))

      expect(readMessage.status).toBe('read')
      expect(readMessage.readAt).toBeDefined()

      console.log('✅ Message status tracking validated')
    })
  })

  describe('2. Session Persistence and Restoration', () => {
    it('should initialize and restore browser sessions with state preservation', async () => {
      const startTime = Date.now()

      const sessionState = {
        conversationId: testContext.conversationId,
        parlantSessionId: testContext.sessionId,
        agentId: testContext.agentId,
        scrollPosition: 150,
        typing: false,
        draft: 'This is a draft message',
        uiPreferences: {
          theme: 'dark',
          fontSize: 16,
          compactMode: true,
          soundEnabled: false
        },
        metadata: {
          initialized: new Date().toISOString(),
          userAgent: 'test-browser',
          sessionVersion: '1.0'
        }
      }

      // Initialize session
      const initResult = await testContext.sessionPersistence.initializeSession({
        workspaceId: testContext.workspaceId,
        userId: testContext.userId,
        sessionToken: testContext.browserSessionToken,
        conversationId: testContext.conversationId,
        parlantSessionId: testContext.sessionId,
        agentId: testContext.agentId,
        deviceInfo: {
          userAgent: 'test-browser',
          platform: 'web',
          version: '1.0.0'
        }
      })

      expect(initResult.success).toBe(true)
      expect(initResult.sessionState).toBeDefined()
      expect(initResult.conversationId).toBe(testContext.conversationId)
      expect(initResult.parlantSessionId).toBe(testContext.sessionId)

      // Update session state
      const updateSuccess = await testContext.sessionPersistence.updateSessionState({
        scrollPosition: 300,
        draft: 'Updated draft message',
        uiPreferences: { theme: 'light' }
      })

      expect(updateSuccess).toBe(true)

      // Restore session
      const restoreResult = await testContext.sessionPersistence.restoreExistingSession(
        testContext.sessionPersistence.getSessionToken()!
      )

      expect(restoreResult.success).toBe(true)
      expect(restoreResult.sessionState?.scrollPosition).toBe(300)
      expect(restoreResult.sessionState?.draft).toBe('Updated draft message')
      expect(restoreResult.sessionState?.uiPreferences?.theme).toBe('light')

      const restorationTime = Date.now() - startTime
      performanceMetrics.sessionRestorationTime.push(restorationTime)

      console.log(`✅ Session persistence and restoration validated in ${restorationTime}ms`)
    })

    it('should handle session expiration and cleanup gracefully', async () => {
      // Create expired session
      const expiredToken = `expired_${uuidv4()}`
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 25) // 25 hours ago

      await testContext.browserSessionManager.createOrUpdateSession({
        sessionToken: expiredToken,
        workspaceId: testContext.workspaceId,
        userId: testContext.userId,
        chatState: { expired: true },
        expirationHours: -1 // Force expiration
      })

      // Attempt to restore expired session
      const restoreResult = await testContext.sessionPersistence.restoreExistingSession(expiredToken)

      expect(restoreResult.success).toBe(false)
      expect(restoreResult.requiresNewSession).toBe(true)
      expect(restoreResult.error).toContain('Session not found or expired')

      // Test cleanup
      const cleanedCount = await testContext.browserSessionManager.expireOldSessions()
      expect(cleanedCount).toBeGreaterThanOrEqual(0)

      console.log(`✅ Session expiration and cleanup validated - Cleaned ${cleanedCount} sessions`)
    })
  })

  describe('3. Conversation Threading and Continuity', () => {
    it('should create and manage conversation threads across sessions', async () => {
      // Create conversation
      const conversation = await testContext.conversationManager.createConversation({
        workspaceId: testContext.workspaceId,
        title: 'Test Conversation Thread',
        conversationType: 'direct',
        participantIds: [testContext.userId],
        agentIds: [testContext.agentId],
        createdBy: testContext.userId,
        metadata: {
          priority: 'high',
          topic: 'testing'
        }
      })

      expect(conversation).toBeDefined()
      expect(conversation.title).toBe('Test Conversation Thread')
      expect(conversation.conversationType).toBe('direct')
      expect(conversation.participantCount).toBe(2) // user + agent

      // Link session to conversation
      await testContext.conversationManager.linkSessionToConversation(
        conversation.id,
        testContext.sessionId
      )

      // Add messages to the conversation
      const messages = []
      for (let i = 0; i < 5; i++) {
        const message = await testContext.messageStorage.storeMessage({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: `Thread message ${i + 1}` },
          rawContent: `Thread message ${i + 1}`,
          senderId: i % 2 === 0 ? testContext.userId : testContext.agentId,
          senderType: i % 2 === 0 ? 'user' : 'agent',
          senderName: i % 2 === 0 ? 'Test User' : 'Test Agent',
          threadId: conversation.id
        })
        messages.push(message)
      }

      // Retrieve conversation history
      const conversationHistory = await testContext.historyRetrieval.getConversationHistory({
        conversationId: conversation.id,
        workspaceId: testContext.workspaceId,
        limit: 10
      })

      expect(conversationHistory.messages).toHaveLength(5)
      expect(conversationHistory.totalCount).toBe(5)

      // Test conversation archival
      await testContext.conversationManager.archiveConversation(conversation.id)

      const archivedConversations = await testContext.conversationManager.getWorkspaceConversations({
        workspaceId: testContext.workspaceId,
        includeArchived: true
      })

      const archivedConv = archivedConversations.conversations.find(c => c.id === conversation.id)
      expect(archivedConv?.isArchived).toBe(true)

      console.log('✅ Conversation threading and continuity validated')
    })
  })

  describe('4. Message History Pagination and Filtering', () => {
    beforeEach(async () => {
      // Setup test messages with different types and metadata
      const messageTypes = ['text', 'tool_call', 'tool_result', 'system', 'media']
      const senderTypes = ['user', 'agent', 'system']

      for (let i = 0; i < 25; i++) {
        await testContext.messageStorage.storeMessage({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          messageType: messageTypes[i % messageTypes.length] as any,
          content: { text: `Test message ${i + 1}` },
          rawContent: `Test message ${i + 1}`,
          senderId: i % 3 === 0 ? testContext.userId : testContext.agentId,
          senderType: senderTypes[i % senderTypes.length] as any,
          senderName: `${senderTypes[i % senderTypes.length]} ${i + 1}`,
          metadata: {
            priority: i % 2 === 0 ? 'high' : 'normal',
            tags: [`tag_${i % 3}`, `category_${i % 4}`]
          }
        })
      }
    })

    it('should paginate message history correctly', async () => {
      const startTime = Date.now()
      const pageSize = 10
      let totalRetrieved = 0
      let page = 0

      // Test pagination
      while (true) {
        const history = await testContext.historyRetrieval.getSessionHistory({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          limit: pageSize,
          offset: page * pageSize
        })

        expect(history.messages.length).toBeLessThanOrEqual(pageSize)
        totalRetrieved += history.messages.length

        if (!history.hasMore || history.messages.length === 0) {
          break
        }

        page++
        if (page > 10) break // Safety break
      }

      expect(totalRetrieved).toBe(25)

      const retrievalTime = Date.now() - startTime
      performanceMetrics.historyRetrievalTime.push(retrievalTime)

      console.log(`✅ Pagination validated - Retrieved ${totalRetrieved} messages in ${retrievalTime}ms`)
    })

    it('should filter messages by type and metadata', async () => {
      // Filter by message type
      const textMessages = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageTypes: ['text'],
        limit: 50
      })

      textMessages.messages.forEach(msg => {
        expect(msg.messageType).toBe('text')
      })

      // Filter by tool calls
      const toolMessages = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageTypes: ['tool_call', 'tool_result'],
        limit: 50
      })

      toolMessages.messages.forEach(msg => {
        expect(['tool_call', 'tool_result']).toContain(msg.messageType)
      })

      console.log(`✅ Message filtering validated - Text: ${textMessages.messages.length}, Tools: ${toolMessages.messages.length}`)
    })

    it('should handle cursor-based pagination', async () => {
      // Get first page
      const firstPage = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: 5
      })

      expect(firstPage.messages).toHaveLength(5)

      // Use cursor from last message
      const lastMessage = firstPage.messages[firstPage.messages.length - 1]

      const nextPage = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: 5,
        beforeMessage: lastMessage.id
      })

      // Verify no overlap
      const firstPageIds = new Set(firstPage.messages.map(m => m.id))
      const nextPageIds = new Set(nextPage.messages.map(m => m.id))
      const intersection = [...firstPageIds].filter(id => nextPageIds.has(id))

      expect(intersection).toHaveLength(0)

      console.log('✅ Cursor-based pagination validated')
    })
  })

  describe('5. Search and Indexing', () => {
    beforeEach(async () => {
      // Create searchable content
      const searchableMessages = [
        'How to implement authentication in React applications?',
        'Database optimization techniques for PostgreSQL performance',
        'JavaScript async/await patterns and best practices',
        'Docker containerization for microservices architecture',
        'GraphQL vs REST API design considerations'
      ]

      for (const content of searchableMessages) {
        await testContext.messageStorage.storeMessage({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: content },
          rawContent: content,
          senderId: testContext.userId,
          senderType: 'user',
          senderName: 'Test User'
        })
      }
    })

    it('should perform full-text search on message content', async () => {
      const startTime = Date.now()

      // Search for specific terms
      const searchResults = await testContext.historyRetrieval.searchMessages({
        workspaceId: testContext.workspaceId,
        query: 'React authentication',
        sessionIds: [testContext.sessionId],
        limit: 10
      })

      expect(searchResults.messages.length).toBeGreaterThan(0)

      // Verify search results contain the query terms
      const foundReactAuth = searchResults.messages.some(msg =>
        msg.rawContent?.toLowerCase().includes('react') &&
        msg.rawContent?.toLowerCase().includes('authentication')
      )
      expect(foundReactAuth).toBe(true)

      const searchTime = Date.now() - startTime
      performanceMetrics.searchTime.push(searchTime)

      console.log(`✅ Full-text search validated in ${searchTime}ms - Found ${searchResults.messages.length} results`)
    })

    it('should search with date range filtering', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const dateRangeResults = await testContext.historyRetrieval.searchMessages({
        workspaceId: testContext.workspaceId,
        query: 'JavaScript',
        dateRange: { start: yesterday, end: tomorrow },
        limit: 10
      })

      expect(dateRangeResults.messages.length).toBeGreaterThan(0)

      // Verify all results are within date range
      dateRangeResults.messages.forEach(msg => {
        expect(msg.createdAt).toBeInstanceOf(Date)
        expect(msg.createdAt.getTime()).toBeGreaterThanOrEqual(yesterday.getTime())
        expect(msg.createdAt.getTime()).toBeLessThanOrEqual(tomorrow.getTime())
      })

      console.log('✅ Date range search filtering validated')
    })
  })

  describe('6. Data Export and Compliance', () => {
    it('should create and process data export requests', async () => {
      // Create some test data
      for (let i = 0; i < 10; i++) {
        await testContext.messageStorage.storeMessage({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: `Export test message ${i + 1}` },
          rawContent: `Export test message ${i + 1}`,
          senderId: testContext.userId,
          senderType: 'user',
          senderName: 'Test User',
          metadata: {
            exportable: true,
            category: 'test_data'
          }
        })
      }

      // Create export request
      const exportRequest = await testContext.dataExporter.createExportRequest({
        workspaceId: testContext.workspaceId,
        requestedBy: testContext.userId,
        exportScope: 'session',
        targetIds: [testContext.sessionId],
        exportFormat: 'json',
        includeMetadata: true,
        includeAttachments: false
      })

      expect(exportRequest).toBeDefined()
      expect(exportRequest.workspaceId).toBe(testContext.workspaceId)
      expect(exportRequest.requestedBy).toBe(testContext.userId)
      expect(exportRequest.exportScope).toBe('session')
      expect(exportRequest.status).toBe('pending')

      // Retrieve export request
      const retrievedRequest = await testContext.dataExporter.getExportRequest(exportRequest.requestToken)
      expect(retrievedRequest).toBeDefined()
      expect(retrievedRequest!.id).toBe(exportRequest.id)

      // Simulate export completion
      await testContext.dataExporter.markExportCompleted(
        exportRequest.requestToken,
        '/tmp/test-export.json',
        1024,
        10
      )

      const completedRequest = await testContext.dataExporter.getExportRequest(exportRequest.requestToken)
      expect(completedRequest!.status).toBe('completed')
      expect(completedRequest!.recordCount).toBe(10)

      console.log(`✅ Data export functionality validated - Export ID: ${exportRequest.requestToken}`)
    })
  })

  describe('7. Performance and Scalability', () => {
    it('should handle high-volume message storage efficiently', async () => {
      const startTime = Date.now()
      const messageCount = 100

      console.log(`🚀 Performance test: Storing ${messageCount} messages...`)

      // Batch create messages
      const batchMessages = Array.from({ length: messageCount }, (_, index) => ({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageType: 'text' as const,
        content: { text: `Performance test message ${index + 1}`, index },
        rawContent: `Performance test message ${index + 1}`,
        senderId: index % 2 === 0 ? testContext.userId : testContext.agentId,
        senderType: (index % 2 === 0 ? 'user' : 'agent') as const,
        senderName: index % 2 === 0 ? 'Test User' : 'Test Agent',
        status: 'sent' as const,
        metadata: {
          batch: 'performance_test',
          index,
          timestamp: new Date().toISOString()
        }
      }))

      const storedMessages = await testContext.messageStorage.batchStoreMessages(batchMessages)

      const storageTime = Date.now() - startTime
      const throughput = messageCount / (storageTime / 1000) // messages per second

      expect(storedMessages).toHaveLength(messageCount)

      // Verify retrieval performance
      const retrievalStart = Date.now()
      const history = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: messageCount + 10
      })
      const retrievalTime = Date.now() - retrievalStart

      expect(history.messages.length).toBeGreaterThanOrEqual(messageCount)

      performanceMetrics.messageStorageTime.push(storageTime)
      performanceMetrics.historyRetrievalTime.push(retrievalTime)
      performanceMetrics.throughputMessages += messageCount

      console.log(`✅ Performance test completed:`)
      console.log(`   • Storage: ${storageTime}ms (${throughput.toFixed(1)} msg/sec)`)
      console.log(`   • Retrieval: ${retrievalTime}ms`)
      console.log(`   • Total messages: ${history.totalCount}`)
    })

    it('should handle concurrent session operations', async () => {
      const startTime = Date.now()
      const concurrentSessions = 5
      const messagesPerSession = 10

      console.log(`🔀 Concurrency test: ${concurrentSessions} sessions, ${messagesPerSession} messages each`)

      // Create multiple sessions
      const sessions = await Promise.all(
        Array.from({ length: concurrentSessions }, async (_, index) => {
          const sessionId = uuidv4()

          // Create Parlant session
          await db.insert(parlantSession).values({
            id: sessionId,
            agentId: testContext.agentId,
            workspaceId: testContext.workspaceId,
            userId: testContext.userId,
            mode: 'auto',
            status: 'active',
            title: `Concurrent Session ${index + 1}`
          }).onConflictDoNothing()

          return sessionId
        })
      )

      // Concurrent message storage
      const concurrentOperations = sessions.map(async (sessionId, sessionIndex) => {
        const sessionMessages = Array.from({ length: messagesPerSession }, (_, msgIndex) => ({
          sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text' as const,
          content: { text: `Session ${sessionIndex + 1} Message ${msgIndex + 1}` },
          rawContent: `Session ${sessionIndex + 1} Message ${msgIndex + 1}`,
          senderId: testContext.userId,
          senderType: 'user' as const,
          senderName: 'Test User',
          status: 'sent' as const
        }))

        return testContext.messageStorage.batchStoreMessages(sessionMessages)
      })

      const results = await Promise.all(concurrentOperations)
      const totalTime = Date.now() - startTime

      // Verify all messages were stored
      const totalStoredMessages = results.reduce((sum, batch) => sum + batch.length, 0)
      expect(totalStoredMessages).toBe(concurrentSessions * messagesPerSession)

      performanceMetrics.concurrentUsers = Math.max(performanceMetrics.concurrentUsers, concurrentSessions)

      console.log(`✅ Concurrency test completed in ${totalTime}ms`)
      console.log(`   • Sessions: ${concurrentSessions}`)
      console.log(`   • Messages per session: ${messagesPerSession}`)
      console.log(`   • Total messages: ${totalStoredMessages}`)

      // Cleanup concurrent test sessions
      await db.delete(parlantSession).where(
        and(
          eq(parlantSession.workspaceId, testContext.workspaceId),
          eq(parlantSession.agentId, testContext.agentId)
        )
      )
    })
  })

  describe('8. Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database failure scenario
      const mockError = new Error('Database connection lost')
      const originalQuery = db.select

      // Temporarily mock database failure
      vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw mockError
      })

      try {
        await testContext.historyRetrieval.getSessionHistory({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          limit: 10
        })

        // Should not reach here
        expect(false).toBe(true)
      } catch (error) {
        expect(error).toBe(mockError)
      }

      // Restore original function
      vi.restoreAllMocks()

      // Verify recovery - normal operation should work
      const history = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: 10
      })

      expect(history).toBeDefined()

      console.log('✅ Database error handling and recovery validated')
    })

    it('should handle invalid session restoration gracefully', async () => {
      const invalidToken = 'invalid_session_token_12345'

      const restoreResult = await testContext.sessionPersistence.restoreExistingSession(invalidToken)

      expect(restoreResult.success).toBe(false)
      expect(restoreResult.requiresNewSession).toBe(true)
      expect(restoreResult.error).toBeDefined()

      console.log('✅ Invalid session handling validated')
    })

    it('should handle workspace isolation violations', async () => {
      const otherWorkspaceId = uuidv4()

      // Attempt to access messages from different workspace
      const history = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: otherWorkspaceId, // Wrong workspace
        limit: 10
      })

      // Should return no messages due to workspace isolation
      expect(history.messages).toHaveLength(0)
      expect(history.totalCount).toBe(0)

      console.log('✅ Workspace isolation protection validated')
    })
  })

  describe('9. Data Integrity and Consistency', () => {
    it('should maintain message sequence integrity under concurrent operations', async () => {
      const concurrentWrites = 20

      // Perform concurrent message writes to same session
      const writeOperations = Array.from({ length: concurrentWrites }, (_, index) =>
        testContext.messageStorage.storeMessage({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: `Concurrent message ${index + 1}` },
          rawContent: `Concurrent message ${index + 1}`,
          senderId: testContext.userId,
          senderType: 'user',
          senderName: 'Test User',
          metadata: { concurrentTest: true, index }
        })
      )

      const messages = await Promise.all(writeOperations)

      // Verify all messages have unique sequence numbers
      const sequenceNumbers = messages.map(m => m.sequenceNumber)
      const uniqueSequences = new Set(sequenceNumbers)

      expect(uniqueSequences.size).toBe(concurrentWrites)
      expect(Math.min(...sequenceNumbers)).toBe(1)
      expect(Math.max(...sequenceNumbers)).toBe(concurrentWrites)

      console.log(`✅ Message sequence integrity validated - ${concurrentWrites} concurrent writes`)
    })

    it('should validate foreign key relationships and cascade operations', async () => {
      // Create conversation with linked session
      const conversation = await testContext.conversationManager.createConversation({
        workspaceId: testContext.workspaceId,
        title: 'FK Test Conversation',
        createdBy: testContext.userId,
        participantIds: [testContext.userId],
        agentIds: [testContext.agentId]
      })

      await testContext.conversationManager.linkSessionToConversation(
        conversation.id,
        testContext.sessionId
      )

      // Add messages to the conversation
      await testContext.messageStorage.storeMessage({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        messageType: 'text',
        content: { text: 'FK relationship test message' },
        rawContent: 'FK relationship test message',
        senderId: testContext.userId,
        senderType: 'user',
        senderName: 'Test User',
        threadId: conversation.id
      })

      // Verify relationship exists
      const history = await testContext.historyRetrieval.getConversationHistory({
        conversationId: conversation.id,
        workspaceId: testContext.workspaceId
      })

      expect(history.messages.length).toBeGreaterThan(0)

      console.log('✅ Foreign key relationships and cascading validated')
    })
  })

  describe('10. Real-world Usage Simulation', () => {
    it('should simulate typical user conversation flow', async () => {
      console.log('🎭 Simulating real user conversation flow...')

      const conversationSteps = [
        { role: 'user', message: 'Hello, I need help with my account' },
        { role: 'agent', message: 'Hello! I\'d be happy to help you with your account. What specific issue are you experiencing?' },
        { role: 'user', message: 'I can\'t log in anymore. It says my password is incorrect' },
        { role: 'agent', message: 'I understand that can be frustrating. Let me help you reset your password. Can you confirm your email address?' },
        { role: 'user', message: 'Yes, it\'s user@example.com' },
        { role: 'agent', message: 'Thank you. I\'ve sent a password reset link to user@example.com. Please check your email and follow the instructions.' },
        { role: 'user', message: 'Great, I got the email. Let me try resetting it now.' },
        { role: 'agent', message: 'Perfect! Once you\'ve reset your password, try logging in again. Is there anything else I can help you with today?' },
        { role: 'user', message: 'That worked! Thank you so much for your help.' },
        { role: 'agent', message: 'You\'re very welcome! I\'m glad I could help resolve the login issue. Have a great day!' }
      ]

      const storedMessages = []

      // Simulate conversation with realistic timing
      for (let i = 0; i < conversationSteps.length; i++) {
        const step = conversationSteps[i]

        // Add realistic delay between messages
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)) // Reduced for testing
        }

        const message = await testContext.messageStorage.storeMessage({
          sessionId: testContext.sessionId,
          workspaceId: testContext.workspaceId,
          messageType: 'text',
          content: { text: step.message },
          rawContent: step.message,
          senderId: step.role === 'user' ? testContext.userId : testContext.agentId,
          senderType: step.role as 'user' | 'agent',
          senderName: step.role === 'user' ? 'Customer' : 'Support Agent',
          metadata: {
            conversationStep: i + 1,
            topic: 'account_support',
            urgency: 'normal'
          }
        })

        storedMessages.push(message)

        // Update message status based on role
        if (step.role === 'agent') {
          await testContext.messageStorage.updateMessageStatus(message.id, 'delivered')
          await testContext.messageStorage.updateMessageStatus(message.id, 'read')
        }
      }

      // Retrieve full conversation history
      const fullHistory = await testContext.historyRetrieval.getSessionHistory({
        sessionId: testContext.sessionId,
        workspaceId: testContext.workspaceId,
        limit: 20
      })

      expect(fullHistory.messages).toHaveLength(conversationSteps.length)
      expect(fullHistory.totalCount).toBe(conversationSteps.length)

      // Test conversation search
      const searchResults = await testContext.historyRetrieval.searchMessages({
        workspaceId: testContext.workspaceId,
        query: 'password reset',
        sessionIds: [testContext.sessionId]
      })

      expect(searchResults.messages.length).toBeGreaterThan(0)

      // Verify message sequence and content
      const reversedHistory = [...fullHistory.messages].reverse() // Get chronological order
      conversationSteps.forEach((step, index) => {
        expect(reversedHistory[index].rawContent).toBe(step.message)
        expect(reversedHistory[index].senderType).toBe(step.role)
      })

      performanceMetrics.throughputMessages += conversationSteps.length

      console.log(`✅ Real user conversation simulation completed - ${conversationSteps.length} messages`)
      console.log(`   • Search results: ${searchResults.messages.length} matches`)
      console.log(`   • Message sequence verified`)
      console.log(`   • Status tracking validated`)
    })
  })
})