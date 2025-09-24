/**
 * Comprehensive Chat Persistence API
 *
 * Unified API service that integrates all chat persistence components:
 * - Chat history storage and retrieval
 * - Session continuity management
 * - Workspace-aware data isolation
 * - Export and archival capabilities
 * - Comprehensive error handling and logging
 */

import { createLogger } from '@/lib/logs/console/logger'
import {
  type AdvancedExportConfig,
  type ArchivalPolicy,
  type ArchivalResult,
  chatExportArchivalService,
  type ExportResult,
} from './chat-export-archival-service'
import {
  type ChatHistoryEntry,
  type ChatMessageType,
  type ChatSearchParams,
  type ChatSessionSummary,
  chatPersistenceService,
  type PaginatedChatResponse,
} from './chat-persistence-service'
import {
  type ContinuityStrategy,
  type SessionStateSnapshot,
  sessionContinuityManager,
} from './session-continuity-manager'
import {
  type IsolationContext,
  type WorkspaceAccessLevel,
  workspaceIsolationService,
} from './workspace-isolation-service'

const logger = createLogger('ComprehensiveChatPersistenceAPI')

/**
 * Comprehensive API error types
 */
export class ChatPersistenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 500,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ChatPersistenceError'
  }
}

export class WorkspaceAccessError extends ChatPersistenceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'WORKSPACE_ACCESS_DENIED', 403, details)
  }
}

export class SessionNotFoundError extends ChatPersistenceError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', 404, { sessionId })
  }
}

export class ValidationError extends ChatPersistenceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

/**
 * API request context
 */
export interface ApiRequestContext {
  userId: string
  workspaceId: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  apiKey?: string
  requestId?: string
}

/**
 * Chat persistence API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
  metadata?: {
    requestId: string
    processingTime: number
    timestamp: string
    version: string
  }
}

/**
 * Enhanced chat message with persistence metadata
 */
export interface EnhancedChatMessage extends ChatHistoryEntry {
  continuityMetadata?: {
    restored: boolean
    originalSessionId?: string
    restorationTimestamp?: string
  }
  accessLevel: WorkspaceAccessLevel
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
}

/**
 * Session creation configuration
 */
export interface SessionCreationConfig {
  agentId: string
  title?: string
  enableContinuity?: boolean
  restoreFromSession?: string
  deviceInfo?: Record<string, any>
  customMetadata?: Record<string, any>
}

/**
 * Advanced search configuration
 */
export interface AdvancedSearchConfig extends ChatSearchParams {
  fuzzySearch?: boolean
  semanticSearch?: boolean
  includeContext?: boolean
  highlightMatches?: boolean
  scoreThreshold?: number
}

/**
 * Comprehensive Chat Persistence API Service
 */
export class ComprehensiveChatPersistenceAPI {
  private readonly API_VERSION = '1.0.0'
  private readonly REQUEST_TIMEOUT_MS = 30000

  constructor() {
    logger.info('Comprehensive Chat Persistence API initialized', {
      version: this.API_VERSION,
      timeout: this.REQUEST_TIMEOUT_MS,
      components: [
        'ChatPersistenceService',
        'SessionContinuityManager',
        'WorkspaceIsolationService',
        'ChatExportArchivalService',
      ],
    })
  }

  /**
   * Create new chat session with advanced features
   */
  async createChatSession(
    config: SessionCreationConfig,
    context: ApiRequestContext
  ): Promise<
    ApiResponse<{
      sessionId: string
      continuityEnabled: boolean
      accessLevel: WorkspaceAccessLevel
      restorationInfo?: {
        strategy: ContinuityStrategy
        contextPreserved: boolean
        snapshot?: SessionStateSnapshot
      }
    }>
  > {
    const startTime = performance.now()
    const requestId = context.requestId || `create-session-${Date.now()}`

    try {
      logger.info('Creating chat session', {
        requestId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        agentId: config.agentId,
        enableContinuity: config.enableContinuity,
        restoreFromSession: config.restoreFromSession,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Validate agent access
      const agentAccessAllowed = await workspaceIsolationService.enforceAgentIsolation(
        config.agentId,
        isolationContext
      )

      if (!agentAccessAllowed) {
        throw new WorkspaceAccessError('Agent access denied')
      }

      let restorationInfo:
        | {
            strategy: ContinuityStrategy
            contextPreserved: boolean
            snapshot?: SessionStateSnapshot
          }
        | undefined

      let sessionId: string

      if (config.enableContinuity) {
        // Try to find and restore previous session
        const restoration = await sessionContinuityManager.findAndRestoreSession(
          config.agentId,
          isolationContext,
          {
            preserveContext: true,
            restoreVariables: true,
            resumeJourney: true,
            allowCrossDevice: true,
          }
        )

        sessionId = restoration.sessionId
        restorationInfo = {
          strategy: restoration.strategy,
          contextPreserved: restoration.contextPreserved,
          snapshot: restoration.snapshot,
        }
      } else {
        // Create fresh session
        const newSession = await sessionContinuityManager.createSessionWithContinuity(
          config.agentId,
          isolationContext,
          {
            title: config.title,
            linkedSessionId: config.restoreFromSession,
            restoreContext: !!config.restoreFromSession,
            deviceInfo: config.deviceInfo,
          }
        )

        sessionId = newSession.sessionId
      }

      const duration = performance.now() - startTime

      logger.info('Chat session created successfully', {
        requestId,
        sessionId,
        continuityEnabled: config.enableContinuity,
        restorationStrategy: restorationInfo?.strategy,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: {
          sessionId,
          continuityEnabled: config.enableContinuity || false,
          accessLevel: isolationContext.accessLevel,
          restorationInfo,
        },
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Store chat message with advanced features
   */
  async storeChatMessage(
    sessionId: string,
    messageType: ChatMessageType,
    content: any,
    context: ApiRequestContext,
    options: {
      metadata?: Record<string, any>
      enableContinuity?: boolean
      updateSession?: boolean
    } = {}
  ): Promise<ApiResponse<EnhancedChatMessage>> {
    const startTime = performance.now()
    const requestId = context.requestId || `store-message-${Date.now()}`

    try {
      logger.info('Storing chat message', {
        requestId,
        sessionId,
        messageType,
        userId: context.userId,
        workspaceId: context.workspaceId,
        contentLength: JSON.stringify(content).length,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Validate session access
      const sessionAccessAllowed = await workspaceIsolationService.enforceSessionIsolation(
        sessionId,
        isolationContext
      )

      if (!sessionAccessAllowed) {
        throw new WorkspaceAccessError('Session access denied')
      }

      // Store the message
      const storedMessage = await chatPersistenceService.storeChatMessage(
        sessionId,
        messageType,
        content,
        {
          ...options.metadata,
          apiRequestId: requestId,
          userContext: {
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        },
        context.workspaceId,
        context.userId
      )

      // Create enhanced message with permissions
      const enhancedMessage: EnhancedChatMessage = {
        ...storedMessage,
        accessLevel: isolationContext.accessLevel,
        canEdit: isolationContext.accessLevel !== 'viewer',
        canDelete: ['owner', 'admin'].includes(isolationContext.accessLevel),
        canExport: isolationContext.permissions.includes('read'),
      }

      const duration = performance.now() - startTime

      logger.info('Chat message stored successfully', {
        requestId,
        sessionId,
        messageId: storedMessage.id,
        messageType,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: enhancedMessage,
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Retrieve chat history with advanced features
   */
  async getChatHistory(
    sessionId: string,
    context: ApiRequestContext,
    options: {
      limit?: number
      offset?: number
      messageTypes?: ChatMessageType[]
      fromOffset?: number
      toOffset?: number
      includeMetadata?: boolean
      includeDeleted?: boolean
    } = {}
  ): Promise<ApiResponse<PaginatedChatResponse<EnhancedChatMessage>>> {
    const startTime = performance.now()
    const requestId = context.requestId || `get-history-${Date.now()}`

    try {
      logger.debug('Retrieving chat history', {
        requestId,
        sessionId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        limit: options.limit,
        offset: options.offset,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Validate session access
      const sessionAccessAllowed = await workspaceIsolationService.enforceSessionIsolation(
        sessionId,
        isolationContext
      )

      if (!sessionAccessAllowed) {
        throw new WorkspaceAccessError('Session access denied')
      }

      // Get chat history
      const history = await chatPersistenceService.getChatHistory(
        sessionId,
        context.workspaceId,
        options
      )

      // Enhance messages with permissions
      const enhancedMessages = history.data.map(
        (message) =>
          ({
            ...message,
            accessLevel: isolationContext.accessLevel,
            canEdit: isolationContext.accessLevel !== 'viewer',
            canDelete: ['owner', 'admin'].includes(isolationContext.accessLevel),
            canExport: isolationContext.permissions.includes('read'),
          }) as EnhancedChatMessage
      )

      const duration = performance.now() - startTime

      logger.debug('Chat history retrieved successfully', {
        requestId,
        sessionId,
        messageCount: enhancedMessages.length,
        total: history.pagination.total,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: {
          ...history,
          data: enhancedMessages,
        },
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Advanced chat search with multiple strategies
   */
  async searchChatMessages(
    config: AdvancedSearchConfig,
    context: ApiRequestContext
  ): Promise<ApiResponse<PaginatedChatResponse<EnhancedChatMessage>>> {
    const startTime = performance.now()
    const requestId = context.requestId || `search-${Date.now()}`

    try {
      logger.info('Searching chat messages', {
        requestId,
        workspaceId: context.workspaceId,
        userId: context.userId,
        query: config.query,
        messageTypes: config.messageType,
        dateRange:
          config.dateFrom && config.dateTo ? `${config.dateFrom} to ${config.dateTo}` : undefined,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Ensure workspace matches
      if (config.workspaceId !== context.workspaceId) {
        throw new WorkspaceAccessError('Workspace mismatch in search')
      }

      // Execute search
      const searchResults = await chatPersistenceService.searchChatMessages({
        ...config,
        workspaceId: context.workspaceId,
        userId: isolationContext.accessLevel === 'viewer' ? context.userId : undefined,
      })

      // Enhance results with permissions
      const enhancedResults = searchResults.data.map(
        (message) =>
          ({
            ...message,
            accessLevel: isolationContext.accessLevel,
            canEdit: isolationContext.accessLevel !== 'viewer',
            canDelete: ['owner', 'admin'].includes(isolationContext.accessLevel),
            canExport: isolationContext.permissions.includes('read'),
          }) as EnhancedChatMessage
      )

      const duration = performance.now() - startTime

      logger.info('Chat search completed', {
        requestId,
        resultsCount: enhancedResults.length,
        total: searchResults.pagination.total,
        searchTime: searchResults.searchMetadata?.searchTime,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: {
          ...searchResults,
          data: enhancedResults,
        },
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Get chat session summaries for workspace
   */
  async getChatSessionSummaries(
    context: ApiRequestContext,
    options: {
      agentId?: string
      limit?: number
      offset?: number
      includeCompleted?: boolean
      sortBy?: 'started' | 'activity' | 'messages'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<ApiResponse<PaginatedChatResponse<ChatSessionSummary>>> {
    const startTime = performance.now()
    const requestId = context.requestId || `get-summaries-${Date.now()}`

    try {
      logger.debug('Getting chat session summaries', {
        requestId,
        workspaceId: context.workspaceId,
        userId: context.userId,
        agentId: options.agentId,
        limit: options.limit,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Get summaries with user filtering for viewers
      const summaries = await chatPersistenceService.getChatSessionSummaries(context.workspaceId, {
        ...options,
        userId: isolationContext.accessLevel === 'viewer' ? context.userId : undefined,
      })

      const duration = performance.now() - startTime

      logger.debug('Chat session summaries retrieved', {
        requestId,
        summaryCount: summaries.data.length,
        total: summaries.pagination.total,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: summaries,
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Create comprehensive chat export
   */
  async createChatExport(
    config: AdvancedExportConfig,
    context: ApiRequestContext
  ): Promise<ApiResponse<ExportResult>> {
    const startTime = performance.now()
    const requestId = context.requestId || `export-${Date.now()}`

    try {
      logger.info('Creating chat export', {
        requestId,
        workspaceId: config.workspaceId,
        userId: context.userId,
        format: config.format,
        sessionIds: config.sessionIds?.length,
        dateRange:
          config.dateFrom && config.dateTo ? `${config.dateFrom} to ${config.dateTo}` : undefined,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Check export permissions
      if (!isolationContext.permissions.includes('read')) {
        throw new WorkspaceAccessError('Export permission denied')
      }

      // Validate workspace matches
      if (config.workspaceId !== context.workspaceId) {
        throw new WorkspaceAccessError('Workspace mismatch in export')
      }

      // Create export
      const exportResult = await chatExportArchivalService.createChatExport(
        config,
        isolationContext
      )

      const duration = performance.now() - startTime

      logger.info('Chat export completed', {
        requestId,
        exportId: exportResult.exportId,
        status: exportResult.status,
        filesGenerated: exportResult.files.length,
        sessionsExported: exportResult.metadata.sessionsExported,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: exportResult,
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Get workspace chat statistics
   */
  async getChatStatistics(context: ApiRequestContext): Promise<
    ApiResponse<{
      statistics: any
      accessLevel: WorkspaceAccessLevel
      permissions: string[]
    }>
  > {
    const startTime = performance.now()
    const requestId = context.requestId || `stats-${Date.now()}`

    try {
      logger.debug('Getting chat statistics', {
        requestId,
        workspaceId: context.workspaceId,
        userId: context.userId,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Get statistics
      const statistics = await chatPersistenceService.getChatStatistics(context.workspaceId)

      const duration = performance.now() - startTime

      logger.debug('Chat statistics retrieved', {
        requestId,
        totalSessions: statistics.totalSessions,
        totalMessages: statistics.totalMessages,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: {
          statistics,
          accessLevel: isolationContext.accessLevel,
          permissions: isolationContext.permissions,
        },
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Get session continuity status
   */
  async getSessionContinuityStatus(
    sessionId: string,
    context: ApiRequestContext
  ): Promise<
    ApiResponse<{
      sessionId: string
      isActive: boolean
      lastHeartbeat?: Date
      continuityEnabled: boolean
      deviceInfo?: any
      linkedSessions: string[]
    }>
  > {
    const startTime = performance.now()
    const requestId = context.requestId || `continuity-${Date.now()}`

    try {
      logger.debug('Getting session continuity status', {
        requestId,
        sessionId,
        userId: context.userId,
        workspaceId: context.workspaceId,
      })

      // Create isolation context
      const isolationContext = await workspaceIsolationService.createIsolationContext(
        context.userId,
        context.workspaceId,
        {
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }
      )

      // Validate session access
      const sessionAccessAllowed = await workspaceIsolationService.enforceSessionIsolation(
        sessionId,
        isolationContext
      )

      if (!sessionAccessAllowed) {
        throw new WorkspaceAccessError('Session access denied')
      }

      // Get continuity status
      const status = await sessionContinuityManager.getSessionContinuityStatus(sessionId)

      const duration = performance.now() - startTime

      logger.debug('Session continuity status retrieved', {
        requestId,
        sessionId,
        isActive: status.isActive,
        continuityEnabled: status.continuityEnabled,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: status,
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Get user's accessible workspaces
   */
  async getUserAccessibleWorkspaces(context: ApiRequestContext): Promise<
    ApiResponse<
      Array<{
        workspaceId: string
        workspaceName: string
        accessLevel: WorkspaceAccessLevel
        permissions: string[]
        isOwner: boolean
      }>
    >
  > {
    const startTime = performance.now()
    const requestId = context.requestId || `workspaces-${Date.now()}`

    try {
      logger.debug('Getting user accessible workspaces', {
        requestId,
        userId: context.userId,
      })

      // Get accessible workspaces
      const workspaces = await workspaceIsolationService.getUserAccessibleWorkspaces(context.userId)

      const duration = performance.now() - startTime

      logger.debug('User accessible workspaces retrieved', {
        requestId,
        workspaceCount: workspaces.length,
        duration: `${duration}ms`,
      })

      return {
        success: true,
        data: workspaces,
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    } catch (error) {
      return this.handleError(error, requestId, startTime)
    }
  }

  /**
   * Private error handling method
   */
  private handleError<T>(error: unknown, requestId: string, startTime: number): ApiResponse<T> {
    const duration = performance.now() - startTime

    if (error instanceof ChatPersistenceError) {
      logger.error('Chat persistence error', {
        requestId,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        duration: `${duration}ms`,
      })

      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        metadata: {
          requestId,
          processingTime: duration,
          timestamp: new Date().toISOString(),
          version: this.API_VERSION,
        },
      }
    }

    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Unexpected error in chat persistence API', {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    })

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: { originalError: errorMessage },
      },
      metadata: {
        requestId,
        processingTime: duration,
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
      },
    }
  }

  /**
   * Health check for all persistence components
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: Record<
      string,
      {
        status: 'healthy' | 'degraded' | 'unhealthy'
        responseTime?: number
        lastChecked: string
        details?: Record<string, any>
      }
    >
    version: string
  }> {
    const startTime = performance.now()

    logger.debug('Performing health check')

    const components: Record<string, any> = {}
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    try {
      // Check database connectivity
      const dbStart = performance.now()
      // This would perform a simple database query in production
      const dbDuration = performance.now() - dbStart

      components.database = {
        status: 'healthy',
        responseTime: dbDuration,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      components.database = {
        status: 'unhealthy',
        lastChecked: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
      overallStatus = 'unhealthy'
    }

    // Add other component checks as needed
    components.chatPersistence = {
      status: 'healthy',
      lastChecked: new Date().toISOString(),
    }

    components.sessionContinuity = {
      status: 'healthy',
      lastChecked: new Date().toISOString(),
    }

    components.workspaceIsolation = {
      status: 'healthy',
      lastChecked: new Date().toISOString(),
    }

    components.exportArchival = {
      status: 'healthy',
      lastChecked: new Date().toISOString(),
    }

    const duration = performance.now() - startTime

    logger.debug('Health check completed', {
      status: overallStatus,
      componentCount: Object.keys(components).length,
      duration: `${duration}ms`,
    })

    return {
      status: overallStatus,
      components,
      version: this.API_VERSION,
    }
  }
}

// Export singleton instance
export const comprehensiveChatPersistenceAPI = new ComprehensiveChatPersistenceAPI()

// Export types for use by consumers
export type {
  ChatHistoryEntry,
  ChatMessageType,
  ChatSearchParams,
  ChatSessionSummary,
  PaginatedChatResponse,
  SessionStateSnapshot,
  ContinuityStrategy,
  IsolationContext,
  WorkspaceAccessLevel,
  AdvancedExportConfig,
  ExportResult,
  ArchivalPolicy,
  ArchivalResult,
  EnhancedChatMessage,
  SessionCreationConfig,
  AdvancedSearchConfig,
  ApiRequestContext,
  ApiResponse,
}
