import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/jest'
import { sql } from 'drizzle-orm'
import { db } from '@packages/db'
import {
  ChatMessageStorage,
  ChatHistoryRetrieval,
  ConversationManager,
  BrowserSessionManager,
  ChatDataExporter,
} from '@packages/db/chat-persistence-queries'
import {
  chatMessage,
  chatConversation,
  chatBrowserSession,
  chatExportRequest,
} from '@packages/db/chat-persistence-schema'
import { parlantSession, parlantAgent } from '@packages/db/parlant-schema'
import { workspace, user } from '@packages/db/schema'
import SessionPersistenceService from '../services/chat-persistence/session-persistence'
import DataRetentionService from '../services/chat-persistence/data-retention'

/**
 * Chat Persistence Test Suite
 *
 * Comprehensive testing for chat persistence functionality including:
 * - Message storage and retrieval
 * - Conversation threading
 * - Session persistence
 * - Data retention and cleanup
 * - Search and filtering
 * - Export functionality
 */

describe('Chat Persistence System', () => {
  let testWorkspaceId: string
  let testUserId: string
  let testAgentId: string
  let testSessionId: string
  let testConversationId: string

  let messageStorage: ChatMessageStorage
  let historyRetrieval: ChatHistoryRetrieval
  let conversationManager: ConversationManager
  let browserSessionManager: BrowserSessionManager
  let dataExporter: ChatDataExporter
  let sessionPersistence: SessionPersistenceService
  let dataRetention: DataRetentionService

  beforeAll(async () => {
    // Initialize service instances
    messageStorage = new ChatMessageStorage(db)
    historyRetrieval = new ChatHistoryRetrieval(db)
    conversationManager = new ConversationManager(db)
    browserSessionManager = new BrowserSessionManager(db)
    dataExporter = new ChatDataExporter(db)
    sessionPersistence = new SessionPersistenceService()
    dataRetention = new DataRetentionService()
  })

  beforeEach(async () => {
    // Create test data
    testWorkspaceId = 'test-workspace-' + Date.now()
    testUserId = 'test-user-' + Date.now()
    testAgentId = 'test-agent-' + Date.now()
    testSessionId = 'test-session-' + Date.now()
    testConversationId = 'test-conversation-' + Date.now()

    // Create test workspace (mock)
    await db.execute(sql`
      INSERT INTO workspace (id, name, "ownerId", "createdAt", "updatedAt")
      VALUES (${testWorkspaceId}, 'Test Workspace', ${testUserId}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `)

    // Create test user (mock)
    await db.execute(sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES (${testUserId}, 'Test User', 'test@example.com', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `)

    // Create test Parlant agent
    await db.execute(sql`
      INSERT INTO parlant_agent (id, "workspaceId", "createdBy", name, description, status)
      VALUES (${testAgentId}, ${testWorkspaceId}, ${testUserId}, 'Test Agent', 'Test Description', 'active')
      ON CONFLICT (id) DO NOTHING
    `)

    // Create test Parlant session
    await db.execute(sql`
      INSERT INTO parlant_session (id, "agentId", "workspaceId", "userId", mode, status)
      VALUES (${testSessionId}, ${testAgentId}, ${testWorkspaceId}, ${testUserId}, 'auto', 'active')
      ON CONFLICT (id) DO NOTHING
    `)
  })

  afterEach(async () => {
    // Cleanup test data
    await db.execute(sql`DELETE FROM chat_message WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM chat_conversation WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM chat_browser_session WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM chat_export_request WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM parlant_session WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM parlant_agent WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM workspace WHERE id = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM "user" WHERE id = ${testUserId}`)
  })

  describe('Message Storage', () => {
    it('should store a message with metadata', async () => {
      const message = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Hello, world!' },
        rawContent: 'Hello, world!',
        senderId: testUserId,
        senderType: 'user',
        senderName: 'Test User',
        metadata: { testFlag: true },
      })

      expect(message).toBeDefined()
      expect(message.sessionId).toBe(testSessionId)
      expect(message.workspaceId).toBe(testWorkspaceId)
      expect(message.messageType).toBe('text')
      expect(message.sequenceNumber).toBe(1)
      expect(message.status).toBe('sent')
      expect(message.metadata).toEqual({ testFlag: true })
    })

    it('should assign sequential sequence numbers', async () => {
      const message1 = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'First message' },
        senderType: 'user',
      })

      const message2 = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Second message' },
        senderType: 'agent',
      })

      expect(message1.sequenceNumber).toBe(1)
      expect(message2.sequenceNumber).toBe(2)
    })

    it('should batch store multiple messages', async () => {
      const messages = await messageStorage.batchStoreMessages([
        {
          sessionId: testSessionId,
          workspaceId: testWorkspaceId,
          messageType: 'text',
          content: { text: 'Message 1' },
          senderType: 'user',
        },
        {
          sessionId: testSessionId,
          workspaceId: testWorkspaceId,
          messageType: 'text',
          content: { text: 'Message 2' },
          senderType: 'agent',
        },
        {
          sessionId: testSessionId,
          workspaceId: testWorkspaceId,
          messageType: 'text',
          content: { text: 'Message 3' },
          senderType: 'user',
        },
      ])

      expect(messages).toHaveLength(3)
      expect(messages[0].sequenceNumber).toBe(1)
      expect(messages[1].sequenceNumber).toBe(2)
      expect(messages[2].sequenceNumber).toBe(3)
    })

    it('should update message status', async () => {
      const message = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Test message' },
        senderType: 'user',
      })

      await messageStorage.updateMessageStatus(message.id, 'delivered')

      const [updatedMessage] = await db
        .select()
        .from(chatMessage)
        .where(sql`id = ${message.id}`)

      expect(updatedMessage.status).toBe('delivered')
      expect(updatedMessage.deliveredAt).toBeDefined()
    })
  })

  describe('Chat History Retrieval', () => {
    beforeEach(async () => {
      // Create test messages
      for (let i = 1; i <= 10; i++) {
        await messageStorage.storeMessage({
          sessionId: testSessionId,
          workspaceId: testWorkspaceId,
          messageType: 'text',
          content: { text: `Message ${i}` },
          rawContent: `Message ${i}`,
          senderType: i % 2 === 0 ? 'agent' : 'user',
        })
      }
    })

    it('should retrieve session history with pagination', async () => {
      const result = await historyRetrieval.getSessionHistory({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        limit: 5,
        offset: 0,
      })

      expect(result.messages).toHaveLength(5)
      expect(result.totalCount).toBe(10)
      expect(result.hasMore).toBe(true)

      // Messages should be ordered by sequence number (descending)
      expect(result.messages[0].sequenceNumber).toBeGreaterThan(
        result.messages[1].sequenceNumber
      )
    })

    it('should filter messages by type', async () => {
      const result = await historyRetrieval.getSessionHistory({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageTypes: ['text'],
      })

      expect(result.messages).toHaveLength(10)
      expect(result.messages.every(m => m.messageType === 'text')).toBe(true)
    })

    it('should search messages by content', async () => {
      await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Special search content' },
        rawContent: 'Special search content',
        senderType: 'user',
      })

      const result = await historyRetrieval.searchMessages({
        workspaceId: testWorkspaceId,
        query: 'Special search',
        limit: 10,
      })

      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.messages[0].relevanceScore).toBeGreaterThan(0)
    })
  })

  describe('Conversation Management', () => {
    it('should create a conversation', async () => {
      const conversation = await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Test Conversation',
        conversationType: 'direct',
        participantIds: [testUserId],
        agentIds: [testAgentId],
        createdBy: testUserId,
      })

      expect(conversation).toBeDefined()
      expect(conversation.title).toBe('Test Conversation')
      expect(conversation.conversationType).toBe('direct')
      expect(conversation.participantIds).toEqual([testUserId])
      expect(conversation.participantCount).toBe(2) // 1 user + 1 agent
    })

    it('should link session to conversation', async () => {
      const conversation = await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Test Conversation',
        conversationType: 'direct',
        createdBy: testUserId,
      })

      await conversationManager.linkSessionToConversation(conversation.id, testSessionId)

      const [updatedConversation] = await db
        .select()
        .from(chatConversation)
        .where(sql`id = ${conversation.id}`)

      expect(updatedConversation.currentSessionId).toBe(testSessionId)
      expect(updatedConversation.sessionIds).toContain(testSessionId)
    })

    it('should get workspace conversations', async () => {
      await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Conversation 1',
        conversationType: 'direct',
        createdBy: testUserId,
      })

      await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Conversation 2',
        conversationType: 'group',
        createdBy: testUserId,
      })

      const result = await conversationManager.getWorkspaceConversations({
        workspaceId: testWorkspaceId,
        userId: testUserId,
      })

      expect(result.conversations).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('should archive conversation', async () => {
      const conversation = await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Test Conversation',
        conversationType: 'direct',
        createdBy: testUserId,
      })

      await conversationManager.archiveConversation(conversation.id)

      const [archivedConversation] = await db
        .select()
        .from(chatConversation)
        .where(sql`id = ${conversation.id}`)

      expect(archivedConversation.isArchived).toBe(true)
      expect(archivedConversation.isActive).toBe(false)
      expect(archivedConversation.archivedAt).toBeDefined()
    })
  })

  describe('Browser Session Management', () => {
    it('should create browser session', async () => {
      const sessionToken = 'test-session-token'
      const chatState = { testState: true }

      const session = await browserSessionManager.createOrUpdateSession({
        sessionToken,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        chatState,
        expirationHours: 24,
      })

      expect(session).toBeDefined()
      expect(session.sessionToken).toBe(sessionToken)
      expect(session.workspaceId).toBe(testWorkspaceId)
      expect(session.userId).toBe(testUserId)
      expect(session.chatState).toEqual(chatState)
      expect(session.isActive).toBe(true)
    })

    it('should restore browser session', async () => {
      const sessionToken = 'test-session-token'
      const chatState = { testState: true }

      await browserSessionManager.createOrUpdateSession({
        sessionToken,
        workspaceId: testWorkspaceId,
        userId: testUserId,
        chatState,
      })

      const restoredSession = await browserSessionManager.restoreSession(sessionToken)

      expect(restoredSession).toBeDefined()
      expect(restoredSession!.sessionToken).toBe(sessionToken)
      expect(restoredSession!.chatState).toEqual(chatState)
    })

    it('should update heartbeat', async () => {
      const sessionToken = 'test-session-token'

      const session = await browserSessionManager.createOrUpdateSession({
        sessionToken,
        workspaceId: testWorkspaceId,
        chatState: {},
      })

      const initialHeartbeat = session.heartbeatCount

      await browserSessionManager.updateHeartbeat(sessionToken)

      const updatedSession = await browserSessionManager.restoreSession(sessionToken)

      expect(updatedSession!.heartbeatCount).toBe(initialHeartbeat + 1)
    })

    it('should expire old sessions', async () => {
      const sessionToken = 'test-expired-session'

      // Create session with past expiration
      await db.execute(sql`
        INSERT INTO chat_browser_session (id, "sessionToken", "workspaceId", "chatState", "expiresAt", "isActive")
        VALUES (gen_random_uuid(), ${sessionToken}, ${testWorkspaceId}, '{}', NOW() - INTERVAL '1 day', true)
      `)

      const expiredCount = await browserSessionManager.expireOldSessions()

      expect(expiredCount).toBeGreaterThan(0)

      const expiredSession = await browserSessionManager.restoreSession(sessionToken)
      expect(expiredSession).toBeNull()
    })
  })

  describe('Session Persistence Service', () => {
    it('should initialize new session', async () => {
      const result = await sessionPersistence.initializeSession({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        conversationId: testConversationId,
        deviceInfo: { userAgent: 'test-agent' },
      })

      expect(result.success).toBe(true)
      expect(result.sessionState).toBeDefined()
      expect(result.requiresNewSession).toBe(false)
    })

    it('should restore existing session', async () => {
      // Initialize session first
      const initResult = await sessionPersistence.initializeSession({
        workspaceId: testWorkspaceId,
        userId: testUserId,
      })

      const sessionToken = sessionPersistence.getSessionToken()!

      // Create new service instance to simulate browser restart
      const newSessionPersistence = new SessionPersistenceService()

      const restoreResult = await newSessionPersistence.restoreExistingSession(sessionToken)

      expect(restoreResult.success).toBe(true)
      expect(restoreResult.sessionState).toBeDefined()
    })

    it('should update session state', async () => {
      await sessionPersistence.initializeSession({
        workspaceId: testWorkspaceId,
        userId: testUserId,
      })

      const updateSuccess = await sessionPersistence.updateSessionState({
        scrollPosition: 100,
        typing: true,
        draft: 'Test draft',
      })

      expect(updateSuccess).toBe(true)
    })
  })

  describe('Data Export', () => {
    it('should create export request', async () => {
      const exportRequest = await dataExporter.createExportRequest({
        workspaceId: testWorkspaceId,
        requestedBy: testUserId,
        exportScope: 'workspace',
        exportFormat: 'json',
      })

      expect(exportRequest).toBeDefined()
      expect(exportRequest.workspaceId).toBe(testWorkspaceId)
      expect(exportRequest.requestedBy).toBe(testUserId)
      expect(exportRequest.exportScope).toBe('workspace')
      expect(exportRequest.status).toBe('pending')
    })

    it('should get export request by token', async () => {
      const exportRequest = await dataExporter.createExportRequest({
        workspaceId: testWorkspaceId,
        requestedBy: testUserId,
        exportScope: 'user',
      })

      const retrievedRequest = await dataExporter.getExportRequest(exportRequest.requestToken)

      expect(retrievedRequest).toBeDefined()
      expect(retrievedRequest!.id).toBe(exportRequest.id)
    })

    it('should mark export as completed', async () => {
      const exportRequest = await dataExporter.createExportRequest({
        workspaceId: testWorkspaceId,
        requestedBy: testUserId,
        exportScope: 'user',
      })

      await dataExporter.markExportCompleted(
        exportRequest.requestToken,
        '/path/to/export.json',
        1024,
        10
      )

      const completedRequest = await dataExporter.getExportRequest(exportRequest.requestToken)

      expect(completedRequest!.status).toBe('completed')
      expect(completedRequest!.exportFilePath).toBe('/path/to/export.json')
      expect(completedRequest!.exportFileSize).toBe(1024)
      expect(completedRequest!.recordCount).toBe(10)
    })
  })

  describe('Data Retention', () => {
    it('should get default retention policy', async () => {
      const policy = await dataRetention.getRetentionPolicy(testWorkspaceId)

      expect(policy).toBeDefined()
      expect(policy.workspaceId).toBe(testWorkspaceId)
      expect(policy.messageRetentionDays).toBe(365)
      expect(policy.enableAutoCleanup).toBe(true)
    })

    it('should execute cleanup in dry run mode', async () => {
      // Create old messages
      await db.execute(sql`
        INSERT INTO chat_message (id, "sessionId", "workspaceId", "sequenceNumber", "messageType", content, "senderType", status, "createdAt")
        VALUES (gen_random_uuid(), ${testSessionId}, ${testWorkspaceId}, 1, 'text', '{"text": "Old message"}', 'user', 'sent', NOW() - INTERVAL '400 days')
      `)

      const stats = await dataRetention.executeCleanup(testWorkspaceId, true)

      expect(stats).toBeDefined()
      expect(stats.processingTime).toBeGreaterThan(0)
      expect(stats.errors).toHaveLength(0)
    })

    it('should generate retention report', async () => {
      const report = await dataRetention.generateRetentionReport(testWorkspaceId)

      expect(report).toBeDefined()
      expect(report.workspaceId).toBe(testWorkspaceId)
      expect(report.policy).toBeDefined()
      expect(report.dataStats).toBeDefined()
      expect(report.complianceStatus).toMatch(/compliant|warning|violation/)
    })

    it('should restore soft deleted data', async () => {
      // Create a message and soft delete it
      const message = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Test message' },
        senderType: 'user',
      })

      await db
        .update(chatMessage)
        .set({ deletedAt: new Date() })
        .where(sql`id = ${message.id}`)

      const restoredCount = await dataRetention.restoreSoftDeleted({
        workspaceId: testWorkspaceId,
        messageIds: [message.id],
      })

      expect(restoredCount).toBe(1)

      const [restoredMessage] = await db
        .select()
        .from(chatMessage)
        .where(sql`id = ${message.id}`)

      expect(restoredMessage.deletedAt).toBeNull()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete chat flow', async () => {
      // 1. Create conversation
      const conversation = await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Integration Test Conversation',
        conversationType: 'direct',
        createdBy: testUserId,
      })

      // 2. Initialize browser session
      const sessionResult = await sessionPersistence.initializeSession({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        conversationId: conversation.id,
        parlantSessionId: testSessionId,
      })

      expect(sessionResult.success).toBe(true)

      // 3. Link session to conversation
      await conversationManager.linkSessionToConversation(conversation.id, testSessionId)

      // 4. Store messages
      const userMessage = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Hello, assistant!' },
        rawContent: 'Hello, assistant!',
        senderId: testUserId,
        senderType: 'user',
      })

      const agentMessage = await messageStorage.storeMessage({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        messageType: 'text',
        content: { text: 'Hello! How can I help you today?' },
        rawContent: 'Hello! How can I help you today?',
        senderId: testAgentId,
        senderType: 'agent',
      })

      // 5. Retrieve history
      const history = await historyRetrieval.getSessionHistory({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
      })

      expect(history.messages).toHaveLength(2)
      expect(history.messages[0].sequenceNumber).toBe(2) // Latest first
      expect(history.messages[1].sequenceNumber).toBe(1)

      // 6. Update session state
      await sessionPersistence.updateSessionState({
        currentMessageId: agentMessage.id,
        scrollPosition: 500,
      })

      // 7. Create export request
      const exportRequest = await dataExporter.createExportRequest({
        workspaceId: testWorkspaceId,
        requestedBy: testUserId,
        exportScope: 'conversation',
        targetIds: [conversation.id],
      })

      expect(exportRequest.status).toBe('pending')
    })

    it('should maintain data consistency across operations', async () => {
      // Create conversation and messages
      const conversation = await conversationManager.createConversation({
        workspaceId: testWorkspaceId,
        title: 'Consistency Test',
        conversationType: 'direct',
        createdBy: testUserId,
      })

      await conversationManager.linkSessionToConversation(conversation.id, testSessionId)

      // Store multiple messages
      for (let i = 1; i <= 5; i++) {
        await messageStorage.storeMessage({
          sessionId: testSessionId,
          workspaceId: testWorkspaceId,
          messageType: 'text',
          content: { text: `Message ${i}` },
          senderType: i % 2 === 0 ? 'agent' : 'user',
        })
      }

      // Verify conversation stats
      const [updatedConversation] = await db
        .select()
        .from(chatConversation)
        .where(sql`id = ${conversation.id}`)

      // Check message count and last activity are updated
      const history = await historyRetrieval.getSessionHistory({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
      })

      expect(history.totalCount).toBe(5)
      expect(updatedConversation.currentSessionId).toBe(testSessionId)
    })
  })
})

describe('Performance Tests', () => {
  let testWorkspaceId: string
  let testSessionId: string
  let messageStorage: ChatMessageStorage
  let historyRetrieval: ChatHistoryRetrieval

  beforeAll(async () => {
    messageStorage = new ChatMessageStorage(db)
    historyRetrieval = new ChatHistoryRetrieval(db)
    testWorkspaceId = 'perf-test-workspace'
    testSessionId = 'perf-test-session'

    // Setup minimal test data
    await db.execute(sql`
      INSERT INTO workspace (id, name, "ownerId", "createdAt", "updatedAt")
      VALUES (${testWorkspaceId}, 'Performance Test', 'test-user', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `)

    await db.execute(sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES ('test-user', 'Test User', 'test@example.com', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `)

    await db.execute(sql`
      INSERT INTO parlant_agent (id, "workspaceId", "createdBy", name, status)
      VALUES ('test-agent', ${testWorkspaceId}, 'test-user', 'Test Agent', 'active')
      ON CONFLICT (id) DO NOTHING
    `)

    await db.execute(sql`
      INSERT INTO parlant_session (id, "agentId", "workspaceId", mode, status)
      VALUES (${testSessionId}, 'test-agent', ${testWorkspaceId}, 'auto', 'active')
      ON CONFLICT (id) DO NOTHING
    `)
  })

  afterAll(async () => {
    // Cleanup
    await db.execute(sql`DELETE FROM chat_message WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM parlant_session WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM parlant_agent WHERE "workspaceId" = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM workspace WHERE id = ${testWorkspaceId}`)
    await db.execute(sql`DELETE FROM "user" WHERE id = 'test-user'`)
  })

  it('should handle high-volume message storage', async () => {
    const messageCount = 1000
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      sessionId: testSessionId,
      workspaceId: testWorkspaceId,
      messageType: 'text' as const,
      content: { text: `Performance test message ${i + 1}` },
      senderType: (i % 2 === 0 ? 'user' : 'agent') as const,
    }))

    const startTime = Date.now()
    const storedMessages = await messageStorage.batchStoreMessages(messages)
    const endTime = Date.now()

    expect(storedMessages).toHaveLength(messageCount)
    expect(endTime - startTime).toBeLessThan(5000) // Should complete in under 5 seconds

    console.log(`Stored ${messageCount} messages in ${endTime - startTime}ms`)
  })

  it('should efficiently retrieve paginated history', async () => {
    const pageSize = 50
    const totalMessages = 500

    // Ensure we have enough messages
    const existingCount = (await historyRetrieval.getSessionHistory({
      sessionId: testSessionId,
      workspaceId: testWorkspaceId,
      limit: 1,
    })).totalCount

    if (existingCount < totalMessages) {
      const additionalMessages = Array.from(
        { length: totalMessages - existingCount },
        (_, i) => ({
          sessionId: testSessionId,
          workspaceId: testWorkspaceId,
          messageType: 'text' as const,
          content: { text: `Additional message ${i + 1}` },
          senderType: 'user' as const,
        })
      )
      await messageStorage.batchStoreMessages(additionalMessages)
    }

    // Test paginated retrieval performance
    const startTime = Date.now()

    for (let page = 0; page < 5; page++) {
      const result = await historyRetrieval.getSessionHistory({
        sessionId: testSessionId,
        workspaceId: testWorkspaceId,
        limit: pageSize,
        offset: page * pageSize,
      })

      expect(result.messages).toHaveLength(pageSize)
    }

    const endTime = Date.now()
    expect(endTime - startTime).toBeLessThan(2000) // Should complete in under 2 seconds

    console.log(`Retrieved 5 pages of ${pageSize} messages each in ${endTime - startTime}ms`)
  })
})