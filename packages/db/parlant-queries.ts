import { and, desc, eq, gte, inArray as inOp, isNull, lte, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import {
  parlantAgent,
  parlantAgentKnowledgeBase,
  parlantAgentTool,
  parlantEvent,
  parlantGuideline,
  parlantJourney,
  parlantJourneyState,
  parlantSession,
  parlantTool,
  parlantVariable,
} from './parlant-schema'
import type {
  AgentFilters,
  AgentWithRelations,
  BatchOperationResult,
  CreateAgentParams,
  CreateEventParams,
  CreateSessionParams,
  EventFilters,
  PaginatedResponse,
  PaginationParams,
  ParlantAgent,
  ParlantError,
  ParlantEvent,
  ParlantSession,
  SessionFilters,
  SessionWithRelations,
} from './parlant-types'
import type * as schema from './schema'

/**
 * Parlant Query Helpers
 *
 * This file provides type-safe, reusable query helpers for common Parlant database operations.
 * All queries are optimized for performance and include proper error handling.
 */

type Database = PostgresJsDatabase<typeof schema>

// =============================================================================
// Agent Query Helpers
// =============================================================================

export class ParlantAgentQueries {
  constructor(private db: Database) {}

  /**
   * Get agent by ID with optional related data
   */
  async getById(id: string, includeRelations = false): Promise<AgentWithRelations | null> {
    const agent = await this.db
      .select()
      .from(parlantAgent)
      .where(and(eq(parlantAgent.id, id), isNull(parlantAgent.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null)

    if (!agent || !includeRelations) {
      return agent as AgentWithRelations | null
    }

    // Load relations if requested
    const [tools, guidelines, journeys, knowledgeBases, sessions] = await Promise.all([
      this.getAgentTools(id),
      this.getAgentGuidelines(id),
      this.getAgentJourneys(id),
      this.getAgentKnowledgeBases(id),
      this.getAgentActiveSessions(id),
    ])

    return {
      ...agent,
      tools,
      guidelines,
      journeys,
      knowledgeBases,
      sessions,
    }
  }

  /**
   * Get agents with filtering and pagination
   */
  async getMany(
    filters: AgentFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResponse<ParlantAgent>> {
    const conditions = this.buildAgentFilters(filters)

    // Get total count
    const totalQuery = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(parlantAgent)
      .where(conditions)

    const total = totalQuery[0]?.count || 0

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.pageSize
    const orderBy = this.buildAgentOrderBy(pagination.sortBy, pagination.sortOrder)

    const agents = await this.db
      .select()
      .from(parlantAgent)
      .where(conditions)
      .orderBy(...orderBy)
      .limit(pagination.pageSize)
      .offset(offset)

    return {
      data: agents,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
        hasNext: pagination.page < Math.ceil(total / pagination.pageSize),
        hasPrevious: pagination.page > 1,
      },
    }
  }

  /**
   * Create new agent
   */
  async create(params: CreateAgentParams): Promise<ParlantAgent> {
    const [agent] = await this.db
      .insert(parlantAgent)
      .values({
        workspaceId: params.workspaceId,
        createdBy: params.createdBy,
        name: params.name,
        description: params.description,
        compositionMode: params.compositionMode || 'fluid',
        systemPrompt: params.systemPrompt,
        modelProvider: params.modelProvider || 'openai',
        modelName: params.modelName || 'gpt-4',
        temperature: params.temperature || 70,
        maxTokens: params.maxTokens || 2000,
        responseTimeoutMs: params.responseTimeoutMs || 30000,
        maxContextLength: params.maxContextLength || 8000,
        systemInstructions: params.systemInstructions,
        allowInterruption: params.allowInterruption ?? true,
        allowProactiveMessages: params.allowProactiveMessages ?? false,
        conversationStyle: params.conversationStyle || 'professional',
        dataRetentionDays: params.dataRetentionDays || 30,
        allowDataExport: params.allowDataExport ?? true,
        piiHandlingMode: params.piiHandlingMode || 'standard',
        integrationMetadata: params.integrationMetadata || {},
        customConfig: params.customConfig || {},
      })
      .returning()

    return agent
  }

  /**
   * Update agent
   */
  async update(id: string, updates: Partial<CreateAgentParams>): Promise<ParlantAgent | null> {
    const [agent] = await this.db
      .update(parlantAgent)
      .set({
        ...updates,
        updatedAt: sql`NOW()`,
      })
      .where(and(eq(parlantAgent.id, id), isNull(parlantAgent.deletedAt)))
      .returning()

    return agent || null
  }

  /**
   * Soft delete agent
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .update(parlantAgent)
      .set({
        deletedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(and(eq(parlantAgent.id, id), isNull(parlantAgent.deletedAt)))

    return result.count > 0
  }

  /**
   * Get agent tools with configurations
   */
  private async getAgentTools(agentId: string) {
    return this.db
      .select()
      .from(parlantAgentTool)
      .innerJoin(parlantTool, eq(parlantAgentTool.toolId, parlantTool.id))
      .where(
        and(
          eq(parlantAgentTool.agentId, agentId),
          eq(parlantAgentTool.enabled, true),
          eq(parlantTool.enabled, true)
        )
      )
      .orderBy(desc(parlantAgentTool.priority))
  }

  /**
   * Get agent guidelines
   */
  private async getAgentGuidelines(agentId: string) {
    return this.db
      .select()
      .from(parlantGuideline)
      .where(and(eq(parlantGuideline.agentId, agentId), eq(parlantGuideline.enabled, true)))
      .orderBy(desc(parlantGuideline.priority))
  }

  /**
   * Get agent journeys
   */
  private async getAgentJourneys(agentId: string) {
    return this.db
      .select()
      .from(parlantJourney)
      .where(and(eq(parlantJourney.agentId, agentId), eq(parlantJourney.enabled, true)))
      .orderBy(desc(parlantJourney.lastUsedAt))
  }

  /**
   * Get agent knowledge bases
   */
  private async getAgentKnowledgeBases(agentId: string) {
    return this.db
      .select({
        id: parlantAgentKnowledgeBase.id,
        agentId: parlantAgentKnowledgeBase.agentId,
        knowledgeBaseId: parlantAgentKnowledgeBase.knowledgeBaseId,
        enabled: parlantAgentKnowledgeBase.enabled,
        searchThreshold: parlantAgentKnowledgeBase.searchThreshold,
        maxResults: parlantAgentKnowledgeBase.maxResults,
        priority: parlantAgentKnowledgeBase.priority,
        knowledgeBase: {
          id: schema.knowledgeBase.id,
          name: schema.knowledgeBase.name,
        },
      })
      .from(parlantAgentKnowledgeBase)
      .innerJoin(
        schema.knowledgeBase,
        eq(parlantAgentKnowledgeBase.knowledgeBaseId, schema.knowledgeBase.id)
      )
      .where(
        and(
          eq(parlantAgentKnowledgeBase.agentId, agentId),
          eq(parlantAgentKnowledgeBase.enabled, true)
        )
      )
      .orderBy(desc(parlantAgentKnowledgeBase.priority))
  }

  /**
   * Get agent active sessions
   */
  private async getAgentActiveSessions(agentId: string) {
    return this.db
      .select()
      .from(parlantSession)
      .where(and(eq(parlantSession.agentId, agentId), eq(parlantSession.status, 'active')))
      .orderBy(desc(parlantSession.lastActivityAt))
      .limit(10) // Limit to recent active sessions
  }

  /**
   * Build filter conditions for agents
   */
  private buildAgentFilters(filters: AgentFilters) {
    const conditions = [isNull(parlantAgent.deletedAt)]

    if (filters.workspaceId) {
      conditions.push(eq(parlantAgent.workspaceId, filters.workspaceId))
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inOp(parlantAgent.status, filters.status))
      } else {
        conditions.push(eq(parlantAgent.status, filters.status))
      }
    }

    if (filters.compositionMode) {
      if (Array.isArray(filters.compositionMode)) {
        conditions.push(inOp(parlantAgent.compositionMode, filters.compositionMode))
      } else {
        conditions.push(eq(parlantAgent.compositionMode, filters.compositionMode))
      }
    }

    if (filters.modelProvider) {
      if (Array.isArray(filters.modelProvider)) {
        conditions.push(inOp(parlantAgent.modelProvider, filters.modelProvider))
      } else {
        conditions.push(eq(parlantAgent.modelProvider, filters.modelProvider))
      }
    }

    if (filters.conversationStyle) {
      if (Array.isArray(filters.conversationStyle)) {
        conditions.push(inOp(parlantAgent.conversationStyle, filters.conversationStyle))
      } else {
        conditions.push(eq(parlantAgent.conversationStyle, filters.conversationStyle))
      }
    }

    if (filters.createdBy) {
      conditions.push(eq(parlantAgent.createdBy, filters.createdBy))
    }

    if (filters.lastActiveAfter) {
      conditions.push(gte(parlantAgent.lastActiveAt, filters.lastActiveAfter))
    }

    if (filters.lastActiveBefore) {
      conditions.push(lte(parlantAgent.lastActiveAt, filters.lastActiveBefore))
    }

    if (filters.hasActiveSessions) {
      // This would require a subquery - simplified for now
      conditions.push(gte(parlantAgent.totalSessions, 1))
    }

    if (filters.search) {
      conditions.push(
        or(
          sql`${parlantAgent.name} ILIKE ${`%${filters.search}%`}`,
          sql`${parlantAgent.description} ILIKE ${`%${filters.search}%`}`
        )
      )
    }

    return and(...conditions)
  }

  /**
   * Build order by clause for agents
   */
  private buildAgentOrderBy(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const column =
      {
        createdAt: parlantAgent.createdAt,
        updatedAt: parlantAgent.updatedAt,
        name: parlantAgent.name,
        lastActiveAt: parlantAgent.lastActiveAt,
        totalSessions: parlantAgent.totalSessions,
        totalMessages: parlantAgent.totalMessages,
      }[sortBy] || parlantAgent.createdAt

    return sortOrder === 'asc' ? [column] : [desc(column)]
  }
}

// =============================================================================
// Session Query Helpers
// =============================================================================

export class ParlantSessionQueries {
  constructor(private db: Database) {}

  /**
   * Get session by ID with optional related data
   */
  async getById(id: string, includeRelations = false): Promise<SessionWithRelations | null> {
    const session = await this.db
      .select()
      .from(parlantSession)
      .where(eq(parlantSession.id, id))
      .limit(1)
      .then((rows) => rows[0] || null)

    if (!session || !includeRelations) {
      return session as SessionWithRelations | null
    }

    // Load relations if requested
    const [agent, events, currentJourney, currentState, variables] = await Promise.all([
      this.getSessionAgent(session.agentId),
      this.getSessionEvents(id),
      session.currentJourneyId ? this.getJourneyById(session.currentJourneyId) : null,
      session.currentStateId ? this.getJourneyStateById(session.currentStateId) : null,
      this.getSessionVariables(id),
    ])

    return {
      ...session,
      agent,
      events,
      currentJourney,
      currentState,
      variables,
    }
  }

  /**
   * Get sessions with filtering and pagination
   */
  async getMany(
    filters: SessionFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResponse<ParlantSession>> {
    const conditions = this.buildSessionFilters(filters)

    // Get total count
    const totalQuery = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(parlantSession)
      .where(conditions)

    const total = totalQuery[0]?.count || 0

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.pageSize
    const orderBy = this.buildSessionOrderBy(pagination.sortBy, pagination.sortOrder)

    const sessions = await this.db
      .select()
      .from(parlantSession)
      .where(conditions)
      .orderBy(...orderBy)
      .limit(pagination.pageSize)
      .offset(offset)

    return {
      data: sessions,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
        hasNext: pagination.page < Math.ceil(total / pagination.pageSize),
        hasPrevious: pagination.page > 1,
      },
    }
  }

  /**
   * Create new session
   */
  async create(params: CreateSessionParams): Promise<ParlantSession> {
    const [session] = await this.db
      .insert(parlantSession)
      .values({
        agentId: params.agentId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        customerId: params.customerId,
        mode: params.mode || 'auto',
        title: params.title,
        metadata: params.metadata || {},
        variables: params.variables || {},
      })
      .returning()

    return session
  }

  /**
   * Update session
   */
  async update(id: string, updates: Partial<CreateSessionParams>): Promise<ParlantSession | null> {
    const [session] = await this.db
      .update(parlantSession)
      .set({
        ...updates,
        updatedAt: sql`NOW()`,
      })
      .where(eq(parlantSession.id, id))
      .returning()

    return session || null
  }

  /**
   * End session
   */
  async end(id: string): Promise<boolean> {
    const result = await this.db
      .update(parlantSession)
      .set({
        status: 'completed',
        endedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(parlantSession.id, id))

    return result.count > 0
  }

  private async getSessionAgent(agentId: string) {
    return this.db
      .select()
      .from(parlantAgent)
      .where(eq(parlantAgent.id, agentId))
      .limit(1)
      .then((rows) => rows[0] || null)
  }

  private async getSessionEvents(sessionId: string) {
    return this.db
      .select()
      .from(parlantEvent)
      .where(eq(parlantEvent.sessionId, sessionId))
      .orderBy(parlantEvent.offset)
      .limit(100) // Limit to recent events
  }

  private async getJourneyById(journeyId: string) {
    return this.db
      .select()
      .from(parlantJourney)
      .where(eq(parlantJourney.id, journeyId))
      .limit(1)
      .then((rows) => rows[0] || null)
  }

  private async getJourneyStateById(stateId: string) {
    return this.db
      .select()
      .from(parlantJourneyState)
      .where(eq(parlantJourneyState.id, stateId))
      .limit(1)
      .then((rows) => rows[0] || null)
  }

  private async getSessionVariables(sessionId: string) {
    return this.db
      .select()
      .from(parlantVariable)
      .where(eq(parlantVariable.sessionId, sessionId))
      .orderBy(parlantVariable.key)
  }

  private buildSessionFilters(filters: SessionFilters) {
    const conditions = []

    if (filters.agentId) {
      if (Array.isArray(filters.agentId)) {
        conditions.push(inOp(parlantSession.agentId, filters.agentId))
      } else {
        conditions.push(eq(parlantSession.agentId, filters.agentId))
      }
    }

    if (filters.workspaceId) {
      conditions.push(eq(parlantSession.workspaceId, filters.workspaceId))
    }

    if (filters.userId) {
      conditions.push(eq(parlantSession.userId, filters.userId))
    }

    if (filters.customerId) {
      conditions.push(eq(parlantSession.customerId, filters.customerId))
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inOp(parlantSession.status, filters.status))
      } else {
        conditions.push(eq(parlantSession.status, filters.status))
      }
    }

    if (filters.mode) {
      if (Array.isArray(filters.mode)) {
        conditions.push(inOp(parlantSession.mode, filters.mode))
      } else {
        conditions.push(eq(parlantSession.mode, filters.mode))
      }
    }

    if (filters.startedAfter) {
      conditions.push(gte(parlantSession.startedAt, filters.startedAfter))
    }

    if (filters.startedBefore) {
      conditions.push(lte(parlantSession.startedAt, filters.startedBefore))
    }

    if (filters.currentJourneyId) {
      conditions.push(eq(parlantSession.currentJourneyId, filters.currentJourneyId))
    }

    if (filters.search) {
      conditions.push(
        or(
          sql`${parlantSession.title} ILIKE ${`%${filters.search}%`}`,
          sql`${parlantSession.metadata}::text ILIKE ${`%${filters.search}%`}`
        )
      )
    }

    return conditions.length > 0 ? and(...conditions) : undefined
  }

  private buildSessionOrderBy(sortBy = 'startedAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const column =
      {
        startedAt: parlantSession.startedAt,
        lastActivityAt: parlantSession.lastActivityAt,
        endedAt: parlantSession.endedAt,
        messageCount: parlantSession.messageCount,
        eventCount: parlantSession.eventCount,
      }[sortBy] || parlantSession.startedAt

    return sortOrder === 'asc' ? [column] : [desc(column)]
  }
}

// =============================================================================
// Event Query Helpers
// =============================================================================

export class ParlantEventQueries {
  constructor(private db: Database) {}

  /**
   * Get events for a session
   */
  async getBySession(
    sessionId: string,
    filters: Omit<EventFilters, 'sessionId'> = {},
    pagination: PaginationParams = { page: 1, pageSize: 50 }
  ): Promise<PaginatedResponse<ParlantEvent>> {
    const conditions = this.buildEventFilters({ ...filters, sessionId })

    // Get total count
    const totalQuery = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(parlantEvent)
      .where(conditions)

    const total = totalQuery[0]?.count || 0

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.pageSize

    const events = await this.db
      .select()
      .from(parlantEvent)
      .where(conditions)
      .orderBy(parlantEvent.offset)
      .limit(pagination.pageSize)
      .offset(offset)

    return {
      data: events,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
        hasNext: pagination.page < Math.ceil(total / pagination.pageSize),
        hasPrevious: pagination.page > 1,
      },
    }
  }

  /**
   * Create new event
   */
  async create(params: CreateEventParams): Promise<ParlantEvent> {
    const [event] = await this.db
      .insert(parlantEvent)
      .values({
        sessionId: params.sessionId,
        offset: params.offset,
        eventType: params.eventType,
        content: params.content,
        metadata: params.metadata || {},
        toolCallId: params.toolCallId,
        journeyId: params.journeyId,
        stateId: params.stateId,
      })
      .returning()

    return event
  }

  /**
   * Get next offset for session
   */
  async getNextOffset(sessionId: string): Promise<number> {
    const result = await this.db
      .select({ maxOffset: sql<number>`COALESCE(MAX(offset), -1)` })
      .from(parlantEvent)
      .where(eq(parlantEvent.sessionId, sessionId))

    return (result[0]?.maxOffset || -1) + 1
  }

  private buildEventFilters(filters: EventFilters) {
    const conditions = []

    if (filters.sessionId) {
      if (Array.isArray(filters.sessionId)) {
        conditions.push(inOp(parlantEvent.sessionId, filters.sessionId))
      } else {
        conditions.push(eq(parlantEvent.sessionId, filters.sessionId))
      }
    }

    if (filters.eventType) {
      if (Array.isArray(filters.eventType)) {
        conditions.push(inOp(parlantEvent.eventType, filters.eventType))
      } else {
        conditions.push(eq(parlantEvent.eventType, filters.eventType))
      }
    }

    if (filters.journeyId) {
      conditions.push(eq(parlantEvent.journeyId, filters.journeyId))
    }

    if (filters.stateId) {
      conditions.push(eq(parlantEvent.stateId, filters.stateId))
    }

    if (filters.toolCallId) {
      conditions.push(eq(parlantEvent.toolCallId, filters.toolCallId))
    }

    if (filters.createdAfter) {
      conditions.push(gte(parlantEvent.createdAt, filters.createdAfter))
    }

    if (filters.createdBefore) {
      conditions.push(lte(parlantEvent.createdAt, filters.createdBefore))
    }

    return conditions.length > 0 ? and(...conditions) : undefined
  }
}

// =============================================================================
// Convenience Query Functions
// =============================================================================

/**
 * Initialize all query helpers with database instance
 */
export function createParlantQueries(db: Database) {
  return {
    agents: new ParlantAgentQueries(db),
    sessions: new ParlantSessionQueries(db),
    events: new ParlantEventQueries(db),
  }
}

/**
 * Type-safe query builder for Parlant entities
 */
export type ParlantQueries = ReturnType<typeof createParlantQueries>

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Helper to safely handle database errors
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ success: true; data: T } | { success: false; error: ParlantError }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    console.error(`Error in ${context}:`, error)

    const parlantError: ParlantError = {
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: { context, originalError: error },
    }

    return { success: false, error: parlantError }
  }
}

/**
 * Batch insert with error handling
 */
export async function batchInsert<T>(
  db: Database,
  table: any,
  items: T[],
  batchSize = 100
): Promise<BatchOperationResult<T>> {
  const result: BatchOperationResult<T> = {
    successful: [],
    failed: [],
    totalAttempted: items.length,
    totalSuccessful: 0,
    totalFailed: 0,
  }

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    try {
      const inserted = await db.insert(table).values(batch).returning()
      result.successful.push(...inserted)
      result.totalSuccessful += inserted.length
    } catch (error) {
      // If batch fails, try individual inserts to identify specific failures
      for (const item of batch) {
        try {
          const [inserted] = await db.insert(table).values(item).returning()
          result.successful.push(inserted)
          result.totalSuccessful++
        } catch (itemError) {
          result.failed.push({
            item,
            error: {
              code: 'VALIDATION_ERROR',
              message: itemError instanceof Error ? itemError.message : 'Unknown error',
              details: { item },
            },
          })
          result.totalFailed++
        }
      }
    }
  }

  return result
}

/**
 * Get workspace-scoped query conditions
 */
export function withWorkspaceScope(workspaceId: string) {
  return {
    agents: eq(parlantAgent.workspaceId, workspaceId),
    sessions: eq(parlantSession.workspaceId, workspaceId),
    tools: eq(parlantTool.workspaceId, workspaceId),
  }
}
