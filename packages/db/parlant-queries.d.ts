import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
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
export declare class ParlantAgentQueries {
  private db
  constructor(db: Database)
  /**
   * Get agent by ID with optional related data
   */
  getById(id: string, includeRelations?: boolean): Promise<AgentWithRelations | null>
  /**
   * Get agents with filtering and pagination
   */
  getMany(
    filters?: AgentFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ParlantAgent>>
  /**
   * Create new agent
   */
  create(params: CreateAgentParams): Promise<ParlantAgent>
  /**
   * Update agent
   */
  update(id: string, updates: Partial<CreateAgentParams>): Promise<ParlantAgent | null>
  /**
   * Soft delete agent
   */
  delete(id: string): Promise<boolean>
  /**
   * Get agent tools with configurations
   */
  private getAgentTools
  /**
   * Get agent guidelines
   */
  private getAgentGuidelines
  /**
   * Get agent journeys
   */
  private getAgentJourneys
  /**
   * Get agent knowledge bases
   */
  private getAgentKnowledgeBases
  /**
   * Get agent active sessions
   */
  private getAgentActiveSessions
  /**
   * Build filter conditions for agents
   */
  private buildAgentFilters
  /**
   * Build order by clause for agents
   */
  private buildAgentOrderBy
}
export declare class ParlantSessionQueries {
  private db
  constructor(db: Database)
  /**
   * Get session by ID with optional related data
   */
  getById(id: string, includeRelations?: boolean): Promise<SessionWithRelations | null>
  /**
   * Get sessions with filtering and pagination
   */
  getMany(
    filters?: SessionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ParlantSession>>
  /**
   * Create new session
   */
  create(params: CreateSessionParams): Promise<ParlantSession>
  /**
   * Update session
   */
  update(id: string, updates: Partial<CreateSessionParams>): Promise<ParlantSession | null>
  /**
   * End session
   */
  end(id: string): Promise<boolean>
  private getSessionAgent
  private getSessionEvents
  private getJourneyById
  private getJourneyStateById
  private getSessionVariables
  private buildSessionFilters
  private buildSessionOrderBy
}
export declare class ParlantEventQueries {
  private db
  constructor(db: Database)
  /**
   * Get events for a session
   */
  getBySession(
    sessionId: string,
    filters?: Omit<EventFilters, 'sessionId'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ParlantEvent>>
  /**
   * Create new event
   */
  create(params: CreateEventParams): Promise<ParlantEvent>
  /**
   * Get next offset for session
   */
  getNextOffset(sessionId: string): Promise<number>
  private buildEventFilters
}
/**
 * Initialize all query helpers with database instance
 */
export declare function createParlantQueries(db: Database): {
  agents: ParlantAgentQueries
  sessions: ParlantSessionQueries
  events: ParlantEventQueries
}
/**
 * Type-safe query builder for Parlant entities
 */
export type ParlantQueries = ReturnType<typeof createParlantQueries>
/**
 * Helper to safely handle database errors
 */
export declare function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: ParlantError
    }
>
/**
 * Batch insert with error handling
 */
export declare function batchInsert<T>(
  db: Database,
  table: any,
  items: T[],
  batchSize?: number
): Promise<BatchOperationResult<T>>
/**
 * Get workspace-scoped query conditions
 */
export declare function withWorkspaceScope(workspaceId: string): {
  agents: import('drizzle-orm').SQL<unknown>
  sessions: import('drizzle-orm').SQL<unknown>
  tools: import('drizzle-orm').SQL<unknown>
}
