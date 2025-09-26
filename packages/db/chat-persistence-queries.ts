import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import {
  type ChatBrowserSession,
  type ChatConversation,
  type ChatExportRequest,
  type ChatMessage,
  chatBrowserSession,
  chatConversation,
  chatExportRequest,
  chatMessage,
  chatSearchIndex,
  type NewChatMessage,
} from './chat-persistence-schema'
import { parlantSession } from './parlant-schema'

/**
 * Chat Persistence Query Layer
 *
 * This module provides a comprehensive query layer for chat persistence operations,
 * including message storage, conversation threading, session management, and data retrieval.
 *
 * Key Features:
 * - High-performance message storage with workspace isolation
 * - Conversation threading and session persistence
 * - Optimized chat history retrieval with pagination
 * - Full-text search capabilities
 * - Data export and compliance features
 */

export type Database = PostgresJsDatabase<Record<string, unknown>>

/**
 * Message Storage Operations
 * High-performance message persistence with metadata and threading
 */
class ChatMessageStorage {
  constructor(private db: Database) {}

  /**
   * Store a chat message with full metadata and threading support
   */
  async storeMessage(params: {
    sessionId: string
    workspaceId: string
    messageType: 'text' | 'tool_call' | 'tool_result' | 'system' | 'error' | 'media' | 'file'
    content: Record<string, any>
    rawContent?: string
    senderId?: string
    senderType: 'user' | 'agent' | 'system'
    senderName?: string
    threadId?: string
    parentMessageId?: string
    toolCallId?: string
    attachments?: any[]
    metadata?: Record<string, any>
  }): Promise<ChatMessage> {
    // Get next sequence number for session
    const [{ nextSeq }] = await this.db
      .select({
        nextSeq: sql<number>`COALESCE(MAX(${chatMessage.sequenceNumber}) + 1, 1)`,
      })
      .from(chatMessage)
      .where(eq(chatMessage.sessionId, params.sessionId))

    const newMessage: NewChatMessage = {
      sessionId: params.sessionId,
      workspaceId: params.workspaceId,
      sequenceNumber: nextSeq,
      messageType: params.messageType,
      content: params.content,
      rawContent: params.rawContent,
      senderId: params.senderId,
      senderType: params.senderType,
      senderName: params.senderName,
      status: 'sent',
      threadId: params.threadId,
      parentMessageId: params.parentMessageId,
      toolCallId: params.toolCallId,
      attachments: params.attachments || [],
      metadata: params.metadata || {},
    }

    const [message] = await this.db.insert(chatMessage).values(newMessage).returning()

    // Update search index asynchronously
    if (params.rawContent) {
      this.updateSearchIndex(message.id, params.rawContent).catch(console.error)
    }

    return message
  }

  /**
   * Batch store multiple messages for high-volume scenarios
   */
  async batchStoreMessages(
    messages: Array<Omit<NewChatMessage, 'sequenceNumber'>>
  ): Promise<ChatMessage[]> {
    // Group messages by session for sequence number assignment
    const messagesBySession = messages.reduce(
      (groups, msg) => {
        if (!groups[msg.sessionId]) {
          groups[msg.sessionId] = []
        }
        groups[msg.sessionId].push(msg)
        return groups
      },
      {} as Record<string, typeof messages>
    )

    const allMessages: NewChatMessage[] = []

    // Assign sequence numbers for each session
    for (const [sessionId, sessionMessages] of Object.entries(messagesBySession)) {
      const [{ nextSeq }] = await this.db
        .select({
          nextSeq: sql<number>`COALESCE(MAX(${chatMessage.sequenceNumber}) + 1, 1)`,
        })
        .from(chatMessage)
        .where(eq(chatMessage.sessionId, sessionId))

      sessionMessages.forEach((msg, index) => {
        allMessages.push({
          ...msg,
          sequenceNumber: nextSeq + index,
        })
      })
    }

    // Insert all messages in batch
    const insertedMessages = await this.db.insert(chatMessage).values(allMessages).returning()

    return insertedMessages
  }

  /**
   * Update message status (delivered, read, etc.)
   */
  async updateMessageStatus(
    messageId: string,
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
    timestamp?: Date
  ): Promise<void> {
    const updates: Partial<ChatMessage> = { status }

    if (status === 'delivered') {
      updates.deliveredAt = timestamp || new Date()
    } else if (status === 'read') {
      updates.readAt = timestamp || new Date()
    }

    await this.db.update(chatMessage).set(updates).where(eq(chatMessage.id, messageId))
  }

  /**
   * Update search index for a message
   */
  private async updateSearchIndex(messageId: string, content: string): Promise<void> {
    const keywords = this.extractKeywords(content)
    const entities = this.extractEntities(content)

    await this.db
      .insert(chatSearchIndex)
      .values({
        messageId,
        workspaceId: '', // Will be populated via join
        sessionId: '', // Will be populated via join
        searchableContent: content,
        keywords,
        entities,
        wordCount: content.split(' ').length,
        characterCount: content.length,
      })
      .onConflictDoUpdate({
        target: chatSearchIndex.messageId,
        set: {
          searchableContent: content,
          keywords,
          entities,
          wordCount: content.split(' ').length,
          characterCount: content.length,
          lastIndexed: new Date(),
        },
      })
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    return content
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3)
      .slice(0, 20)
  }

  private extractEntities(content: string): any[] {
    // Basic entity extraction - can be enhanced with NER
    const entities = []

    // Extract email addresses
    const emails = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
    if (emails) {
      entities.push(...emails.map((email) => ({ type: 'email', value: email })))
    }

    // Extract URLs
    const urls = content.match(/https?:\/\/[^\s]+/g)
    if (urls) {
      entities.push(...urls.map((url) => ({ type: 'url', value: url })))
    }

    return entities.slice(0, 10)
  }
}

/**
 * Chat History Retrieval
 * Optimized queries for chat history with pagination and filtering
 */
class ChatHistoryRetrieval {
  constructor(private db: Database) {}

  /**
   * Get chat history for a session with pagination
   */
  async getSessionHistory(params: {
    sessionId: string
    workspaceId: string
    limit?: number
    offset?: number
    beforeMessage?: string
    afterMessage?: string
    messageTypes?: string[]
    includeDeleted?: boolean
  }): Promise<{
    messages: ChatMessage[]
    totalCount: number
    hasMore: boolean
  }> {
    const limit = params.limit || 50
    const offset = params.offset || 0

    let query = this.db
      .select()
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.sessionId, params.sessionId),
          eq(chatMessage.workspaceId, params.workspaceId),
          params.includeDeleted ? undefined : isNull(chatMessage.deletedAt)
        )
      )

    // Apply message type filtering
    if (params.messageTypes?.length) {
      query = query.where(inArray(chatMessage.messageType, params.messageTypes))
    }

    // Apply cursor-based pagination
    if (params.beforeMessage) {
      const beforeSeq = await this.getMessageSequence(params.beforeMessage)
      if (beforeSeq) {
        query = query.where(lte(chatMessage.sequenceNumber, beforeSeq))
      }
    }

    if (params.afterMessage) {
      const afterSeq = await this.getMessageSequence(params.afterMessage)
      if (afterSeq) {
        query = query.where(gte(chatMessage.sequenceNumber, afterSeq))
      }
    }

    // Get messages with pagination
    const messages = await query
      .orderBy(desc(chatMessage.sequenceNumber))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.sessionId, params.sessionId),
          eq(chatMessage.workspaceId, params.workspaceId),
          params.includeDeleted ? undefined : isNull(chatMessage.deletedAt)
        )
      )

    return {
      messages,
      totalCount: count,
      hasMore: offset + messages.length < count,
    }
  }

  /**
   * Get conversation history across multiple sessions
   */
  async getConversationHistory(params: {
    conversationId: string
    workspaceId: string
    limit?: number
    offset?: number
    dateRange?: { start: Date; end: Date }
  }): Promise<{
    messages: (ChatMessage & { sessionInfo: any })[]
    totalCount: number
    hasMore: boolean
  }> {
    const limit = params.limit || 100
    const offset = params.offset || 0

    let query = this.db
      .select({
        message: chatMessage,
        session: {
          id: parlantSession.id,
          title: parlantSession.title,
          startedAt: parlantSession.startedAt,
        },
      })
      .from(chatMessage)
      .innerJoin(parlantSession, eq(chatMessage.sessionId, parlantSession.id))
      .innerJoin(chatConversation, eq(parlantSession.id, chatConversation.currentSessionId))
      .where(
        and(
          eq(chatConversation.id, params.conversationId),
          eq(chatMessage.workspaceId, params.workspaceId),
          isNull(chatMessage.deletedAt)
        )
      )

    // Apply date range filtering
    if (params.dateRange) {
      query = query.where(
        and(
          gte(chatMessage.createdAt, params.dateRange.start),
          lte(chatMessage.createdAt, params.dateRange.end)
        )
      )
    }

    const results = await query.orderBy(desc(chatMessage.createdAt)).limit(limit).offset(offset)

    const messages = results.map((result) => ({
      ...result.message,
      sessionInfo: result.session,
    }))

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chatMessage)
      .innerJoin(parlantSession, eq(chatMessage.sessionId, parlantSession.id))
      .innerJoin(chatConversation, eq(parlantSession.id, chatConversation.currentSessionId))
      .where(
        and(
          eq(chatConversation.id, params.conversationId),
          eq(chatMessage.workspaceId, params.workspaceId),
          isNull(chatMessage.deletedAt)
        )
      )

    return {
      messages,
      totalCount: count,
      hasMore: offset + messages.length < count,
    }
  }

  /**
   * Search messages with full-text search
   */
  async searchMessages(params: {
    workspaceId: string
    query: string
    sessionIds?: string[]
    conversationIds?: string[]
    dateRange?: { start: Date; end: Date }
    messageTypes?: string[]
    limit?: number
    offset?: number
  }): Promise<{
    messages: (ChatMessage & { relevanceScore: number })[]
    totalCount: number
    hasMore: boolean
  }> {
    const limit = params.limit || 25
    const offset = params.offset || 0

    const searchTerms = params.query
      .toLowerCase()
      .split(' ')
      .filter((term) => term.length > 2)

    let query = this.db
      .select({
        message: chatMessage,
        relevanceScore: sql<number>`
          CASE
            WHEN ${chatMessage.rawContent} ILIKE ${`%${params.query}%`} THEN 100
            ELSE 50
          END
        `,
      })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.workspaceId, params.workspaceId),
          or(
            ilike(chatMessage.rawContent, `%${params.query}%`),
            ...searchTerms.map((term) => ilike(chatMessage.rawContent, `%${term}%`))
          ),
          isNull(chatMessage.deletedAt)
        )
      )

    // Apply additional filters
    if (params.sessionIds?.length) {
      query = query.where(inArray(chatMessage.sessionId, params.sessionIds))
    }

    if (params.messageTypes?.length) {
      query = query.where(inArray(chatMessage.messageType, params.messageTypes))
    }

    if (params.dateRange) {
      query = query.where(
        and(
          gte(chatMessage.createdAt, params.dateRange.start),
          lte(chatMessage.createdAt, params.dateRange.end)
        )
      )
    }

    const results = await query
      .orderBy(desc(sql`relevanceScore`), desc(chatMessage.createdAt))
      .limit(limit)
      .offset(offset)

    const messages = results.map((result) => ({
      ...result.message,
      relevanceScore: result.relevanceScore,
    }))

    // Get total count (simplified for performance)
    const totalCount = Math.min(messages.length + (offset > 0 ? 1000 : 0), 1000)

    return {
      messages,
      totalCount,
      hasMore: messages.length === limit,
    }
  }

  private async getMessageSequence(messageId: string): Promise<number | null> {
    const result = await this.db
      .select({ sequenceNumber: chatMessage.sequenceNumber })
      .from(chatMessage)
      .where(eq(chatMessage.id, messageId))
      .limit(1)

    return result[0]?.sequenceNumber || null
  }
}

/**
 * Conversation Management
 * Handle conversation threading and session grouping
 */
class ConversationManager {
  constructor(private db: Database) {}

  /**
   * Create a new conversation
   */
  async createConversation(params: {
    workspaceId: string
    title?: string
    conversationType?: 'direct' | 'group' | 'workflow' | 'support' | 'onboarding'
    participantIds?: string[]
    agentIds?: string[]
    createdBy: string
    metadata?: Record<string, any>
  }): Promise<ChatConversation> {
    const [conversation] = await this.db
      .insert(chatConversation)
      .values({
        workspaceId: params.workspaceId,
        title: params.title,
        conversationType: params.conversationType || 'direct',
        participantIds: params.participantIds || [],
        agentIds: params.agentIds || [],
        createdBy: params.createdBy,
        participantCount: (params.participantIds?.length || 0) + (params.agentIds?.length || 0),
        customData: params.metadata || {},
      })
      .returning()

    return conversation
  }

  /**
   * Link a session to a conversation
   */
  async linkSessionToConversation(conversationId: string, sessionId: string): Promise<void> {
    await this.db
      .update(chatConversation)
      .set({
        currentSessionId: sessionId,
        sessionIds: sql`array_append(coalesce(${chatConversation.sessionIds}, '{}'::uuid[]), ${sessionId}::uuid)`,
        lastActivityAt: new Date(),
      })
      .where(eq(chatConversation.id, conversationId))
  }

  /**
   * Get active conversations for workspace
   */
  async getWorkspaceConversations(params: {
    workspaceId: string
    userId?: string
    limit?: number
    offset?: number
    includeArchived?: boolean
  }): Promise<{
    conversations: ChatConversation[]
    totalCount: number
    hasMore: boolean
  }> {
    const limit = params.limit || 50
    const offset = params.offset || 0

    let whereConditions = and(
      eq(chatConversation.workspaceId, params.workspaceId),
      isNull(chatConversation.deletedAt)
    )

    if (!params.includeArchived) {
      whereConditions = and(whereConditions, eq(chatConversation.isArchived, false))
    }

    if (params.userId) {
      whereConditions = and(
        whereConditions,
        or(
          eq(chatConversation.createdBy, params.userId),
          sql`${params.userId} = ANY(${chatConversation.participantIds})`
        )
      )
    }

    const conversations = await this.db
      .select()
      .from(chatConversation)
      .where(whereConditions)
      .orderBy(desc(chatConversation.lastActivityAt))
      .limit(limit)
      .offset(offset)

    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chatConversation)
      .where(whereConditions)

    return {
      conversations,
      totalCount: count,
      hasMore: offset + conversations.length < count,
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    await this.db
      .update(chatConversation)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        isActive: false,
      })
      .where(eq(chatConversation.id, conversationId))
  }
}

/**
 * Browser Session Persistence
 * Handle cross-browser session restoration
 */
class BrowserSessionManager {
  constructor(private db: Database) {}

  /**
   * Create or update browser session
   */
  async createOrUpdateSession(params: {
    sessionToken: string
    workspaceId: string
    userId?: string
    conversationId?: string
    parlantSessionId?: string
    chatState: Record<string, any>
    deviceInfo?: Record<string, any>
    expirationHours?: number
  }): Promise<ChatBrowserSession> {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (params.expirationHours || 24))

    const sessionData = {
      sessionToken: params.sessionToken,
      workspaceId: params.workspaceId,
      userId: params.userId,
      conversationId: params.conversationId,
      parlantSessionId: params.parlantSessionId,
      chatState: params.chatState,
      deviceInfo: params.deviceInfo || {},
      expiresAt,
      lastHeartbeat: new Date(),
    }

    const [session] = await this.db
      .insert(chatBrowserSession)
      .values(sessionData)
      .onConflictDoUpdate({
        target: chatBrowserSession.sessionToken,
        set: {
          ...sessionData,
          heartbeatCount: sql`${chatBrowserSession.heartbeatCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning()

    return session
  }

  /**
   * Restore browser session by token
   */
  async restoreSession(sessionToken: string): Promise<ChatBrowserSession | null> {
    const [session] = await this.db
      .select()
      .from(chatBrowserSession)
      .where(
        and(
          eq(chatBrowserSession.sessionToken, sessionToken),
          eq(chatBrowserSession.isActive, true),
          gte(chatBrowserSession.expiresAt, new Date())
        )
      )
      .limit(1)

    if (session) {
      // Update last heartbeat
      await this.updateHeartbeat(sessionToken)
    }

    return session || null
  }

  /**
   * Update session heartbeat
   */
  async updateHeartbeat(sessionToken: string): Promise<void> {
    await this.db
      .update(chatBrowserSession)
      .set({
        lastHeartbeat: new Date(),
        heartbeatCount: sql`${chatBrowserSession.heartbeatCount} + 1`,
      })
      .where(eq(chatBrowserSession.sessionToken, sessionToken))
  }

  /**
   * Expire old sessions (cleanup task)
   */
  async expireOldSessions(): Promise<number> {
    const result = await this.db
      .update(chatBrowserSession)
      .set({
        isActive: false,
      })
      .where(lte(chatBrowserSession.expiresAt, new Date()))

    return result.rowCount || 0
  }
}

/**
 * Data Export and Compliance
 * Handle data portability and export requests
 */
class ChatDataExporter {
  constructor(private db: Database) {}

  /**
   * Create export request
   */
  async createExportRequest(params: {
    workspaceId: string
    requestedBy: string
    exportScope: 'workspace' | 'user' | 'conversation' | 'session'
    targetIds?: string[]
    dateRange?: { start: Date; end: Date }
    exportFormat?: 'json' | 'csv' | 'markdown'
    includeMetadata?: boolean
    includeAttachments?: boolean
  }): Promise<ChatExportRequest> {
    const requestToken = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiration

    const [exportRequest] = await this.db
      .insert(chatExportRequest)
      .values({
        requestToken,
        workspaceId: params.workspaceId,
        requestedBy: params.requestedBy,
        exportScope: params.exportScope,
        targetIds: params.targetIds || [],
        dateRange: params.dateRange,
        exportFormat: params.exportFormat || 'json',
        includeMetadata: params.includeMetadata ?? true,
        includeAttachments: params.includeAttachments ?? true,
        expiresAt,
      })
      .returning()

    return exportRequest
  }

  /**
   * Get export request by token
   */
  async getExportRequest(requestToken: string): Promise<ChatExportRequest | null> {
    const [request] = await this.db
      .select()
      .from(chatExportRequest)
      .where(
        and(
          eq(chatExportRequest.requestToken, requestToken),
          gte(chatExportRequest.expiresAt, new Date())
        )
      )
      .limit(1)

    return request || null
  }

  /**
   * Mark export as completed
   */
  async markExportCompleted(
    requestToken: string,
    exportFilePath: string,
    fileSize: number,
    recordCount: number
  ): Promise<void> {
    await this.db
      .update(chatExportRequest)
      .set({
        status: 'completed',
        exportFilePath,
        exportFileSize: fileSize,
        recordCount,
        processingCompletedAt: new Date(),
      })
      .where(eq(chatExportRequest.requestToken, requestToken))
  }
}

// Export all query classes
export {
  ChatMessageStorage,
  ChatHistoryRetrieval,
  ConversationManager,
  BrowserSessionManager,
  ChatDataExporter,
}
