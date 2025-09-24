/**
 * Chat Persistence Service
 *
 * Comprehensive chat history persistence and management system for Parlant conversations.
 * Provides advanced features for chat history storage, retrieval, search, export, and archival
 * with enterprise-grade security and workspace isolation.
 */

import { db } from '@sim/db'
import { parlantAgent, parlantEvent, parlantSession, user } from '@sim/db/schema'
import { and, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatPersistenceService')

/**
 * Chat message types for better organization
 */
export type ChatMessageType =
  | 'customer_message'
  | 'agent_message'
  | 'tool_call'
  | 'tool_result'
  | 'status_update'
  | 'journey_transition'
  | 'variable_update'

/**
 * Chat history entry with enhanced metadata
 */
export interface ChatHistoryEntry {
  id: string
  sessionId: string
  agentId: string
  workspaceId: string
  userId?: string
  offset: number
  type: ChatMessageType
  content: any
  metadata: Record<string, any>
  timestamp: string
  userAgent?: string
  ipAddress?: string
  editedAt?: string
  deletedAt?: string
}

/**
 * Chat session summary for history lists
 */
export interface ChatSessionSummary {
  sessionId: string
  agentId: string
  agentName: string
  workspaceId: string
  userId?: string
  title?: string
  messageCount: number
  lastMessage?: string
  lastMessageType?: ChatMessageType
  startedAt: string
  lastActivityAt: string
  endedAt?: string
  status: 'active' | 'completed' | 'abandoned'
  tags: string[]
  duration?: number // in seconds
  satisfaction?: number // 1-5 rating
}

/**
 * Chat search parameters
 */
export interface ChatSearchParams {
  workspaceId: string
  userId?: string
  agentId?: string
  sessionId?: string
  query?: string
  messageType?: ChatMessageType[]
  dateFrom?: Date
  dateTo?: Date
  tags?: string[]
  includeDeleted?: boolean
  limit?: number
  offset?: number
  sortBy?: 'timestamp' | 'relevance'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Chat export options
 */
export interface ChatExportOptions {
  workspaceId: string
  sessionIds?: string[]
  agentIds?: string[]
  userIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  format: 'json' | 'csv' | 'markdown' | 'html'
  includeMetadata?: boolean
  includeSystemMessages?: boolean
  anonymizeUsers?: boolean
  maxSessions?: number
}

/**
 * Chat archival configuration
 */
export interface ChatArchivalConfig {
  workspaceId: string
  retentionDays: number
  archiveInactive?: boolean
  archiveCompleted?: boolean
  deleteAfterArchival?: boolean
  compressionLevel?: number
}

/**
 * Paginated response wrapper
 */
export interface PaginatedChatResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  searchMetadata?: {
    query?: string
    resultsCount: number
    searchTime: number
  }
}

/**
 * Chat statistics
 */
export interface ChatStatistics {
  workspaceId: string
  totalSessions: number
  totalMessages: number
  activeSessions: number
  averageSessionDuration: number
  averageMessagesPerSession: number
  mostActiveAgent?: {
    agentId: string
    name: string
    sessionCount: number
  }
  messageTypeBreakdown: Record<ChatMessageType, number>
  dailyActivity: Array<{
    date: string
    sessionCount: number
    messageCount: number
  }>
}

/**
 * Advanced Chat Persistence Service
 */
export class ChatPersistenceService {
  private readonly SEARCH_RESULTS_LIMIT = 1000
  private readonly EXPORT_BATCH_SIZE = 100
  private readonly ARCHIVAL_BATCH_SIZE = 50

  constructor() {
    logger.info('Chat Persistence Service initialized', {
      searchLimit: this.SEARCH_RESULTS_LIMIT,
      exportBatchSize: this.EXPORT_BATCH_SIZE,
      archivalBatchSize: this.ARCHIVAL_BATCH_SIZE,
    })
  }

  /**
   * Store chat message with enhanced metadata
   */
  async storeChatMessage(
    sessionId: string,
    messageType: ChatMessageType,
    content: any,
    metadata: Record<string, any>,
    workspaceId: string,
    userId?: string
  ): Promise<ChatHistoryEntry> {
    const startTime = performance.now()
    const requestId = `store-message-${Date.now()}`

    try {
      logger.info('Storing chat message', {
        requestId,
        sessionId,
        messageType,
        workspaceId,
        userId,
        contentLength: JSON.stringify(content).length,
      })

      // Get current session to validate workspace isolation
      const session = await db
        .select({
          id: parlantSession.id,
          workspaceId: parlantSession.workspaceId,
          agentId: parlantSession.agentId,
          eventCount: parlantSession.eventCount,
        })
        .from(parlantSession)
        .where(and(eq(parlantSession.id, sessionId), eq(parlantSession.workspaceId, workspaceId)))
        .limit(1)

      if (session.length === 0) {
        throw new Error('Session not found or access denied')
      }

      const currentSession = session[0]

      // Calculate next offset for event ordering
      const nextOffset = currentSession.eventCount

      // Enhanced metadata with security and tracking
      const enhancedMetadata = {
        ...metadata,
        storedAt: new Date().toISOString(),
        workspaceId,
        userId,
        contentHash: this.generateContentHash(content),
        version: '1.0',
      }

      // Insert the chat event
      const [newEvent] = await db
        .insert(parlantEvent)
        .values({
          sessionId,
          offset: nextOffset,
          eventType: messageType,
          content,
          metadata: enhancedMetadata,
          createdAt: new Date(),
        })
        .returning()

      if (!newEvent) {
        throw new Error('Failed to store chat message')
      }

      // Update session statistics
      await db
        .update(parlantSession)
        .set({
          eventCount: sql`${parlantSession.eventCount} + 1`,
          messageCount: messageType.includes('message')
            ? sql`${parlantSession.messageCount} + 1`
            : parlantSession.messageCount,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(parlantSession.id, sessionId))

      const duration = performance.now() - startTime

      logger.info('Chat message stored successfully', {
        requestId,
        eventId: newEvent.id,
        offset: newEvent.offset,
        duration: `${duration}ms`,
      })

      return {
        id: newEvent.id,
        sessionId: newEvent.sessionId,
        agentId: currentSession.agentId,
        workspaceId,
        userId,
        offset: newEvent.offset,
        type: newEvent.eventType as ChatMessageType,
        content: newEvent.content,
        metadata: newEvent.metadata as Record<string, any>,
        timestamp: newEvent.createdAt.toISOString(),
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to store chat message', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Retrieve chat history with advanced filtering and pagination
   */
  async getChatHistory(
    sessionId: string,
    workspaceId: string,
    options: {
      limit?: number
      offset?: number
      messageTypes?: ChatMessageType[]
      fromOffset?: number
      toOffset?: number
      includeMetadata?: boolean
    } = {}
  ): Promise<PaginatedChatResponse<ChatHistoryEntry>> {
    const startTime = performance.now()
    const requestId = `get-history-${Date.now()}`

    try {
      const {
        limit = 50,
        offset = 0,
        messageTypes,
        fromOffset,
        toOffset,
        includeMetadata = true,
      } = options

      logger.debug('Retrieving chat history', {
        requestId,
        sessionId,
        workspaceId,
        limit,
        offset,
        messageTypes,
        fromOffset,
        toOffset,
      })

      // Build query conditions with workspace isolation
      const conditions = [
        eq(parlantEvent.sessionId, sessionId),
        eq(parlantSession.workspaceId, workspaceId),
      ]

      if (messageTypes && messageTypes.length > 0) {
        conditions.push(or(...messageTypes.map((type) => eq(parlantEvent.eventType, type))))
      }

      if (fromOffset !== undefined) {
        conditions.push(gte(parlantEvent.offset, fromOffset))
      }

      if (toOffset !== undefined) {
        conditions.push(lte(parlantEvent.offset, toOffset))
      }

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .where(and(...conditions))

      const total = totalResult?.count || 0

      // Get paginated results with agent and session info
      const events = await db
        .select({
          id: parlantEvent.id,
          sessionId: parlantEvent.sessionId,
          agentId: parlantSession.agentId,
          workspaceId: parlantSession.workspaceId,
          userId: parlantSession.userId,
          offset: parlantEvent.offset,
          eventType: parlantEvent.eventType,
          content: parlantEvent.content,
          metadata: includeMetadata ? parlantEvent.metadata : sql`'{}'::jsonb`,
          createdAt: parlantEvent.createdAt,
          sessionUserAgent: parlantSession.userAgent,
          sessionIpAddress: parlantSession.ipAddress,
        })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .where(and(...conditions))
        .orderBy(desc(parlantEvent.offset))
        .limit(limit)
        .offset(offset)

      const duration = performance.now() - startTime

      logger.debug('Chat history retrieved successfully', {
        requestId,
        count: events.length,
        total,
        duration: `${duration}ms`,
      })

      return {
        data: events.map((event) => ({
          id: event.id,
          sessionId: event.sessionId,
          agentId: event.agentId,
          workspaceId: event.workspaceId,
          userId: event.userId || undefined,
          offset: event.offset,
          type: event.eventType as ChatMessageType,
          content: event.content,
          metadata: (event.metadata as Record<string, any>) || {},
          timestamp: event.createdAt.toISOString(),
          userAgent: event.sessionUserAgent || undefined,
          ipAddress: event.sessionIpAddress || undefined,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + events.length < total,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to retrieve chat history', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Search chat messages across sessions with full-text search
   */
  async searchChatMessages(
    params: ChatSearchParams
  ): Promise<PaginatedChatResponse<ChatHistoryEntry>> {
    const startTime = performance.now()
    const requestId = `search-messages-${Date.now()}`

    try {
      const {
        workspaceId,
        userId,
        agentId,
        sessionId,
        query,
        messageType,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = params

      logger.info('Searching chat messages', {
        requestId,
        workspaceId,
        query,
        messageTypes: messageType,
        dateRange: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : undefined,
        limit,
        offset,
      })

      // Build search conditions with workspace isolation
      const conditions = [eq(parlantSession.workspaceId, workspaceId)]

      if (userId) conditions.push(eq(parlantSession.userId, userId))
      if (agentId) conditions.push(eq(parlantSession.agentId, agentId))
      if (sessionId) conditions.push(eq(parlantEvent.sessionId, sessionId))

      if (messageType && messageType.length > 0) {
        conditions.push(or(...messageType.map((type) => eq(parlantEvent.eventType, type))))
      }

      if (dateFrom) conditions.push(gte(parlantEvent.createdAt, dateFrom))
      if (dateTo) conditions.push(lte(parlantEvent.createdAt, dateTo))

      // Full-text search on content
      if (query) {
        conditions.push(
          or(
            ilike(sql`${parlantEvent.content}::text`, `%${query}%`),
            ilike(sql`${parlantEvent.metadata}::text`, `%${query}%`)
          )
        )
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .where(and(...conditions))

      const total = Math.min(totalResult?.count || 0, this.SEARCH_RESULTS_LIMIT)

      // Get search results with ranking
      const searchResults = await db
        .select({
          id: parlantEvent.id,
          sessionId: parlantEvent.sessionId,
          agentId: parlantSession.agentId,
          workspaceId: parlantSession.workspaceId,
          userId: parlantSession.userId,
          offset: parlantEvent.offset,
          eventType: parlantEvent.eventType,
          content: parlantEvent.content,
          metadata: parlantEvent.metadata,
          createdAt: parlantEvent.createdAt,
          sessionUserAgent: parlantSession.userAgent,
          sessionIpAddress: parlantSession.ipAddress,
          agentName: parlantAgent.name,
        })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
        .where(and(...conditions))
        .orderBy(
          sortOrder === 'desc'
            ? desc(sortBy === 'timestamp' ? parlantEvent.createdAt : parlantEvent.offset)
            : sortBy === 'timestamp'
              ? parlantEvent.createdAt
              : parlantEvent.offset
        )
        .limit(Math.min(limit, this.SEARCH_RESULTS_LIMIT))
        .offset(offset)

      const duration = performance.now() - startTime

      logger.info('Chat search completed', {
        requestId,
        resultsCount: searchResults.length,
        total,
        duration: `${duration}ms`,
      })

      return {
        data: searchResults.map((result) => ({
          id: result.id,
          sessionId: result.sessionId,
          agentId: result.agentId,
          workspaceId: result.workspaceId,
          userId: result.userId || undefined,
          offset: result.offset,
          type: result.eventType as ChatMessageType,
          content: result.content,
          metadata: (result.metadata as Record<string, any>) || {},
          timestamp: result.createdAt.toISOString(),
          userAgent: result.sessionUserAgent || undefined,
          ipAddress: result.sessionIpAddress || undefined,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + searchResults.length < total,
        },
        searchMetadata: {
          query,
          resultsCount: searchResults.length,
          searchTime: duration,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to search chat messages', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Get chat session summaries for workspace
   */
  async getChatSessionSummaries(
    workspaceId: string,
    options: {
      userId?: string
      agentId?: string
      limit?: number
      offset?: number
      includeCompleted?: boolean
      sortBy?: 'started' | 'activity' | 'messages'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<PaginatedChatResponse<ChatSessionSummary>> {
    const startTime = performance.now()
    const requestId = `get-summaries-${Date.now()}`

    try {
      const {
        userId,
        agentId,
        limit = 20,
        offset = 0,
        includeCompleted = true,
        sortBy = 'activity',
        sortOrder = 'desc',
      } = options

      logger.debug('Getting chat session summaries', {
        requestId,
        workspaceId,
        userId,
        agentId,
        limit,
        offset,
      })

      // Build conditions
      const conditions = [eq(parlantSession.workspaceId, workspaceId)]

      if (userId) conditions.push(eq(parlantSession.userId, userId))
      if (agentId) conditions.push(eq(parlantSession.agentId, agentId))
      if (!includeCompleted) {
        conditions.push(eq(parlantSession.status, 'active'))
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(parlantSession)
        .where(and(...conditions))

      const total = totalResult?.count || 0

      // Get session summaries with agent info and latest message
      const summaries = await db
        .select({
          sessionId: parlantSession.id,
          agentId: parlantSession.agentId,
          agentName: parlantAgent.name,
          workspaceId: parlantSession.workspaceId,
          userId: parlantSession.userId,
          title: parlantSession.title,
          messageCount: parlantSession.messageCount,
          startedAt: parlantSession.startedAt,
          lastActivityAt: parlantSession.lastActivityAt,
          endedAt: parlantSession.endedAt,
          status: parlantSession.status,
          tags: parlantSession.tags,
          satisfactionScore: parlantSession.satisfactionScore,
        })
        .from(parlantSession)
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
        .where(and(...conditions))
        .orderBy(
          sortOrder === 'desc'
            ? desc(
                sortBy === 'started'
                  ? parlantSession.startedAt
                  : sortBy === 'activity'
                    ? parlantSession.lastActivityAt
                    : parlantSession.messageCount
              )
            : sortBy === 'started'
              ? parlantSession.startedAt
              : sortBy === 'activity'
                ? parlantSession.lastActivityAt
                : parlantSession.messageCount
        )
        .limit(limit)
        .offset(offset)

      // Get latest message for each session (if needed)
      // This would be optimized with a more complex query in production
      const sessionSummaries: ChatSessionSummary[] = await Promise.all(
        summaries.map(async (summary) => {
          const duration =
            summary.endedAt && summary.startedAt
              ? Math.floor((summary.endedAt.getTime() - summary.startedAt.getTime()) / 1000)
              : summary.lastActivityAt && summary.startedAt
                ? Math.floor(
                    (summary.lastActivityAt.getTime() - summary.startedAt.getTime()) / 1000
                  )
                : undefined

          return {
            sessionId: summary.sessionId,
            agentId: summary.agentId,
            agentName: summary.agentName,
            workspaceId: summary.workspaceId,
            userId: summary.userId || undefined,
            title: summary.title || undefined,
            messageCount: summary.messageCount,
            startedAt: summary.startedAt.toISOString(),
            lastActivityAt: summary.lastActivityAt.toISOString(),
            endedAt: summary.endedAt?.toISOString(),
            status: summary.status as 'active' | 'completed' | 'abandoned',
            tags: (summary.tags as string[]) || [],
            duration,
            satisfaction: summary.satisfactionScore || undefined,
          }
        })
      )

      const duration = performance.now() - startTime

      logger.debug('Chat session summaries retrieved', {
        requestId,
        count: sessionSummaries.length,
        total,
        duration: `${duration}ms`,
      })

      return {
        data: sessionSummaries,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + sessionSummaries.length < total,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to get chat session summaries', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Export chat data in various formats
   */
  async exportChatData(options: ChatExportOptions): Promise<{
    format: string
    data: string | Buffer
    filename: string
    contentType: string
    metadata: {
      sessionCount: number
      messageCount: number
      exportedAt: string
      workspaceId: string
    }
  }> {
    const startTime = performance.now()
    const requestId = `export-chat-${Date.now()}`

    try {
      logger.info('Exporting chat data', {
        requestId,
        workspaceId: options.workspaceId,
        format: options.format,
        sessionIds: options.sessionIds?.length,
        dateRange:
          options.dateFrom && options.dateTo
            ? `${options.dateFrom} to ${options.dateTo}`
            : undefined,
      })

      // Build export query conditions
      const conditions = [eq(parlantSession.workspaceId, options.workspaceId)]

      if (options.sessionIds && options.sessionIds.length > 0) {
        conditions.push(or(...options.sessionIds.map((id) => eq(parlantSession.id, id))))
      }
      if (options.agentIds && options.agentIds.length > 0) {
        conditions.push(or(...options.agentIds.map((id) => eq(parlantSession.agentId, id))))
      }
      if (options.userIds && options.userIds.length > 0) {
        conditions.push(or(...options.userIds.map((id) => eq(parlantSession.userId, id))))
      }
      if (options.dateFrom) conditions.push(gte(parlantEvent.createdAt, options.dateFrom))
      if (options.dateTo) conditions.push(lte(parlantEvent.createdAt, options.dateTo))

      // Get export data in batches
      const allExportData: any[] = []
      let offset = 0
      let sessionCount = 0
      let messageCount = 0

      while (true) {
        const batch = await db
          .select({
            sessionId: parlantSession.id,
            agentId: parlantSession.agentId,
            agentName: parlantAgent.name,
            userId: parlantSession.userId,
            eventId: parlantEvent.id,
            eventType: parlantEvent.eventType,
            offset: parlantEvent.offset,
            content: parlantEvent.content,
            metadata: options.includeMetadata ? parlantEvent.metadata : sql`'{}'::jsonb`,
            createdAt: parlantEvent.createdAt,
            sessionStarted: parlantSession.startedAt,
            sessionTitle: parlantSession.title,
            userName: user.name,
            userEmail: options.anonymizeUsers ? sql`'[ANONYMIZED]'` : user.email,
          })
          .from(parlantEvent)
          .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
          .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
          .leftJoin(user, eq(parlantSession.userId, user.id))
          .where(and(...conditions))
          .orderBy(parlantSession.startedAt, parlantEvent.offset)
          .limit(this.EXPORT_BATCH_SIZE)
          .offset(offset)

        if (batch.length === 0) break

        allExportData.push(...batch)
        offset += this.EXPORT_BATCH_SIZE
        messageCount += batch.length
        sessionCount = new Set(batch.map((row) => row.sessionId)).size

        if (options.maxSessions && sessionCount >= options.maxSessions) break
      }

      // Format data based on requested format
      let exportData: string | Buffer
      let contentType: string
      let fileExtension: string

      switch (options.format) {
        case 'json':
          exportData = JSON.stringify(allExportData, null, 2)
          contentType = 'application/json'
          fileExtension = 'json'
          break

        case 'csv':
          exportData = this.formatAsCSV(allExportData)
          contentType = 'text/csv'
          fileExtension = 'csv'
          break

        case 'markdown':
          exportData = this.formatAsMarkdown(allExportData)
          contentType = 'text/markdown'
          fileExtension = 'md'
          break

        case 'html':
          exportData = this.formatAsHTML(allExportData)
          contentType = 'text/html'
          fileExtension = 'html'
          break

        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      const duration = performance.now() - startTime
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `chat-export-${options.workspaceId}-${timestamp}.${fileExtension}`

      logger.info('Chat data export completed', {
        requestId,
        format: options.format,
        sessionCount,
        messageCount,
        fileSize: typeof exportData === 'string' ? exportData.length : exportData.length,
        duration: `${duration}ms`,
      })

      return {
        format: options.format,
        data: exportData,
        filename,
        contentType,
        metadata: {
          sessionCount,
          messageCount,
          exportedAt: new Date().toISOString(),
          workspaceId: options.workspaceId,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to export chat data', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Archive old chat sessions based on retention policy
   */
  async archiveChatSessions(config: ChatArchivalConfig): Promise<{
    archivedSessions: number
    archivedMessages: number
    deletedSessions: number
    deletedMessages: number
    archivalReport: {
      processed: number
      errors: number
      duration: number
    }
  }> {
    const startTime = performance.now()
    const requestId = `archive-chat-${Date.now()}`

    try {
      logger.info('Starting chat archival process', {
        requestId,
        workspaceId: config.workspaceId,
        retentionDays: config.retentionDays,
        archiveInactive: config.archiveInactive,
        archiveCompleted: config.archiveCompleted,
      })

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)

      // Build archival conditions
      const conditions = [
        eq(parlantSession.workspaceId, config.workspaceId),
        lte(parlantSession.lastActivityAt, cutoffDate),
      ]

      if (config.archiveInactive || config.archiveCompleted) {
        const statusConditions = []
        if (config.archiveInactive) statusConditions.push(eq(parlantSession.status, 'abandoned'))
        if (config.archiveCompleted) statusConditions.push(eq(parlantSession.status, 'completed'))
        conditions.push(or(...statusConditions))
      }

      // Get sessions to archive
      const sessionsToArchive = await db
        .select({
          sessionId: parlantSession.id,
          messageCount: parlantSession.messageCount,
          status: parlantSession.status,
        })
        .from(parlantSession)
        .where(and(...conditions))

      let archivedSessions = 0
      let archivedMessages = 0
      let deletedSessions = 0
      let deletedMessages = 0
      let errors = 0

      // Process in batches
      for (let i = 0; i < sessionsToArchive.length; i += this.ARCHIVAL_BATCH_SIZE) {
        const batch = sessionsToArchive.slice(i, i + this.ARCHIVAL_BATCH_SIZE)

        try {
          // Archive/delete sessions based on configuration
          for (const session of batch) {
            if (config.deleteAfterArchival) {
              // Hard delete (for GDPR compliance scenarios)
              await db.delete(parlantSession).where(eq(parlantSession.id, session.sessionId))
              deletedSessions++
              deletedMessages += session.messageCount
            } else {
              // Soft archive (mark as archived, could be moved to cold storage)
              await db
                .update(parlantSession)
                .set({
                  status: 'completed', // Mark as completed/archived
                  metadata: sql`${parlantSession.metadata} || '{"archived": true, "archivedAt": "${new Date().toISOString()}"}'::jsonb`,
                  updatedAt: new Date(),
                })
                .where(eq(parlantSession.id, session.sessionId))

              archivedSessions++
              archivedMessages += session.messageCount
            }
          }

          logger.debug('Archival batch completed', {
            requestId,
            batchSize: batch.length,
            totalProcessed: i + batch.length,
          })
        } catch (batchError) {
          logger.error('Archival batch failed', {
            requestId,
            batchIndex: Math.floor(i / this.ARCHIVAL_BATCH_SIZE),
            error: batchError instanceof Error ? batchError.message : 'Unknown error',
          })
          errors += batch.length
        }
      }

      const duration = performance.now() - startTime

      logger.info('Chat archival process completed', {
        requestId,
        archivedSessions,
        archivedMessages,
        deletedSessions,
        deletedMessages,
        errors,
        duration: `${duration}ms`,
      })

      return {
        archivedSessions,
        archivedMessages,
        deletedSessions,
        deletedMessages,
        archivalReport: {
          processed: sessionsToArchive.length,
          errors,
          duration,
        },
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Chat archival process failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Get comprehensive chat statistics for workspace
   */
  async getChatStatistics(workspaceId: string): Promise<ChatStatistics> {
    const startTime = performance.now()
    const requestId = `get-stats-${Date.now()}`

    try {
      logger.debug('Getting chat statistics', { requestId, workspaceId })

      // Get basic session statistics
      const [sessionStats] = await db
        .select({
          totalSessions: count(),
          activeSessions: count(eq(parlantSession.status, 'active')),
        })
        .from(parlantSession)
        .where(eq(parlantSession.workspaceId, workspaceId))

      // Get message statistics
      const [messageStats] = await db
        .select({
          totalMessages: count(),
        })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .where(eq(parlantSession.workspaceId, workspaceId))

      // Get message type breakdown
      const messageTypeBreakdown = await db
        .select({
          eventType: parlantEvent.eventType,
          count: count(),
        })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .where(eq(parlantSession.workspaceId, workspaceId))
        .groupBy(parlantEvent.eventType)

      // Get most active agent
      const [mostActiveAgent] = await db
        .select({
          agentId: parlantAgent.id,
          name: parlantAgent.name,
          sessionCount: count(),
        })
        .from(parlantSession)
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
        .where(eq(parlantSession.workspaceId, workspaceId))
        .groupBy(parlantAgent.id, parlantAgent.name)
        .orderBy(desc(count()))
        .limit(1)

      // Calculate averages
      const totalSessions = sessionStats?.totalSessions || 0
      const totalMessages = messageStats?.totalMessages || 0
      const averageMessagesPerSession =
        totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0

      // Get daily activity (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const dailyActivity = await db
        .select({
          date: sql<string>`DATE(${parlantSession.startedAt})`,
          sessionCount: count(parlantSession.id),
          messageCount: count(parlantEvent.id),
        })
        .from(parlantSession)
        .leftJoin(parlantEvent, eq(parlantSession.id, parlantEvent.sessionId))
        .where(
          and(
            eq(parlantSession.workspaceId, workspaceId),
            gte(parlantSession.startedAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${parlantSession.startedAt})`)
        .orderBy(sql`DATE(${parlantSession.startedAt})`)

      const duration = performance.now() - startTime

      logger.debug('Chat statistics retrieved', {
        requestId,
        totalSessions,
        totalMessages,
        duration: `${duration}ms`,
      })

      return {
        workspaceId,
        totalSessions,
        totalMessages,
        activeSessions: sessionStats?.activeSessions || 0,
        averageSessionDuration: 0, // Would need session duration calculation
        averageMessagesPerSession,
        mostActiveAgent: mostActiveAgent
          ? {
              agentId: mostActiveAgent.agentId,
              name: mostActiveAgent.name,
              sessionCount: mostActiveAgent.sessionCount,
            }
          : undefined,
        messageTypeBreakdown: messageTypeBreakdown.reduce(
          (acc, item) => {
            acc[item.eventType as ChatMessageType] = item.count
            return acc
          },
          {} as Record<ChatMessageType, number>
        ),
        dailyActivity: dailyActivity.map((item) => ({
          date: item.date,
          sessionCount: item.sessionCount,
          messageCount: item.messageCount,
        })),
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to get chat statistics', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private generateContentHash(content: any): string {
    // Simple content hash for duplicate detection and integrity
    return require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex')
      .substring(0, 16)
  }

  private formatAsCSV(data: any[]): string {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            if (value == null) return ''
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            return `"${String(value).replace(/"/g, '""')}"`
          })
          .join(',')
      ),
    ]
    return csvRows.join('\n')
  }

  private formatAsMarkdown(data: any[]): string {
    if (data.length === 0) return '# Chat Export\n\nNo data found.'

    let markdown = '# Chat Export\n\n'
    let currentSession = ''

    for (const row of data) {
      if (row.sessionId !== currentSession) {
        currentSession = row.sessionId
        markdown += `## Session: ${row.sessionTitle || row.sessionId}\n\n`
        markdown += `**Agent:** ${row.agentName}\n`
        markdown += `**User:** ${row.userName || 'Anonymous'}\n`
        markdown += `**Started:** ${row.sessionStarted}\n\n`
      }

      markdown += `### ${row.eventType} (${row.createdAt})\n\n`
      if (typeof row.content === 'string') {
        markdown += `${row.content}\n\n`
      } else {
        markdown += `\`\`\`json\n${JSON.stringify(row.content, null, 2)}\n\`\`\`\n\n`
      }
    }

    return markdown
  }

  private formatAsHTML(data: any[]): string {
    if (data.length === 0) {
      return '<html><head><title>Chat Export</title></head><body><h1>No data found</h1></body></html>'
    }

    let html = `
      <html>
      <head>
        <title>Chat Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .session { border: 1px solid #ccc; margin: 20px 0; padding: 15px; }
          .message { margin: 10px 0; padding: 10px; border-left: 3px solid #007cba; }
          .agent-message { border-left-color: #28a745; }
          .customer-message { border-left-color: #007cba; }
          .metadata { font-size: 0.8em; color: #666; }
          pre { background: #f8f9fa; padding: 10px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Chat Export</h1>
    `

    let currentSession = ''
    for (const row of data) {
      if (row.sessionId !== currentSession) {
        if (currentSession) html += '</div>'
        currentSession = row.sessionId
        html += `
          <div class="session">
            <h2>${row.sessionTitle || row.sessionId}</h2>
            <div class="metadata">
              <strong>Agent:</strong> ${row.agentName} |
              <strong>User:</strong> ${row.userName || 'Anonymous'} |
              <strong>Started:</strong> ${row.sessionStarted}
            </div>
        `
      }

      const messageClass = row.eventType.includes('agent') ? 'agent-message' : 'customer-message'
      html += `
        <div class="message ${messageClass}">
          <div class="metadata">${row.eventType} - ${row.createdAt}</div>
          <div class="content">
      `

      if (typeof row.content === 'string') {
        html += `<p>${row.content}</p>`
      } else {
        html += `<pre>${JSON.stringify(row.content, null, 2)}</pre>`
      }

      html += '</div></div>'
    }

    if (currentSession) html += '</div>'
    html += '</body></html>'

    return html
  }
}

// Export singleton instance
export const chatPersistenceService = new ChatPersistenceService()
