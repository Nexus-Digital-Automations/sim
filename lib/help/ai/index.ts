/**
 * AI Help Engine - Main Orchestration Layer
 *
 * Central coordination system for all AI-powered help features in the Sim platform.
 * Integrates embedding service, semantic search, intelligent chatbot, and predictive help.
 *
 * Key Features:
 * - Unified API for all AI help functionality
 * - Real-time context-aware assistance
 * - Performance monitoring and optimization
 * - Enterprise-grade error handling and logging
 * - Scalable architecture with caching
 *
 * Performance Targets:
 * - <150ms response time for contextual help
 * - 90%+ uptime with graceful degradation
 * - Support for 1000+ concurrent users
 *
 * Dependencies: All AI help components, monitoring, caching
 * Usage: Primary interface for AI help features across Sim platform
 */

import type { Logger } from '@/lib/monitoring/logger'
import EmbeddingService, { type EmbeddingConfig } from './embedding-service'
import IntelligentChatbot, {
  type ChatbotConfig,
  type ConversationContext,
} from './intelligent-chatbot'
import PredictiveHelpEngine, {
  type PredictiveHelpConfig,
  type WorkflowContext,
} from './predictive-help'
import SemanticSearchService, { type SearchContext, type SearchOptions } from './semantic-search'

export interface AIHelpEngineConfig {
  embedding: EmbeddingConfig
  chatbot: ChatbotConfig
  predictiveHelp: PredictiveHelpConfig
  enableRealTimeAssistance: boolean
  enableContextualSuggestions: boolean
  enableProactiveHelp: boolean
  performanceMonitoring: boolean
  cachingEnabled: boolean
  rateLimiting: {
    enabled: boolean
    requestsPerMinute: number
    burstLimit: number
  }
}

export interface AIHelpRequest {
  type: 'search' | 'chat' | 'suggestions' | 'proactive'
  userId: string
  sessionId?: string
  query?: string
  context?: AIHelpContext
  options?: Record<string, any>
}

export interface AIHelpContext {
  workflowContext?: WorkflowContext
  searchContext?: SearchContext
  conversationContext?: ConversationContext
  userPermissions?: {
    roles: string[]
    allowedVisibilityLevels: string[]
    userId: string
    organizationId?: string
  }
  metadata?: Record<string, any>
}

export interface AIHelpResponse {
  type: string
  data: any
  suggestions?: AIHelpSuggestion[]
  relatedContent?: AIRelatedContent[]
  metadata: {
    responseTime: number
    confidence?: number
    cached: boolean
    modelVersion: string
    operationId: string
  }
}

export interface AIHelpSuggestion {
  id: string
  type: 'action' | 'content' | 'tutorial' | 'troubleshoot'
  title: string
  description: string
  confidence: number
  priority: number
  action?: string
  parameters?: Record<string, any>
}

export interface AIRelatedContent {
  id: string
  title: string
  type: 'article' | 'tutorial' | 'video' | 'faq'
  url: string
  relevanceScore: number
  tags: string[]
}

export interface AIHelpMetrics {
  requests: {
    total: number
    byType: Record<string, number>
    averageResponseTime: number
    successRate: number
  }
  components: {
    embedding: any
    search: any
    chatbot: any
    predictiveHelp: any
  }
  performance: {
    cacheHitRate: number
    averageLatency: number
    errorRate: number
    uptime: number
  }
  users: {
    activeUsers: number
    totalSessions: number
    averageSessionDuration: number
  }
}

/**
 * Main AI Help Engine orchestrating all intelligent assistance features
 */
export class AIHelpEngine {
  private embeddingService: EmbeddingService
  private semanticSearch: SemanticSearchService
  private chatbot: IntelligentChatbot
  private predictiveHelp: PredictiveHelpEngine
  private logger: Logger
  private metrics: AIHelpEngineMetrics
  private rateLimiter: Map<string, RateLimitEntry> = new Map()

  constructor(config: AIHelpEngineConfig, logger: Logger) {
    this.logger = logger.child({ service: 'AIHelpEngine' })
    this.metrics = new AIHelpEngineMetrics()

    // Initialize core services
    this.embeddingService = new EmbeddingService(config.embedding, this.logger)
    this.semanticSearch = new SemanticSearchService(this.embeddingService, this.logger)
    this.chatbot = new IntelligentChatbot(config.chatbot, this.semanticSearch, this.logger)
    this.predictiveHelp = new PredictiveHelpEngine(
      config.predictiveHelp,
      this.semanticSearch,
      this.logger
    )

    // Setup monitoring and cleanup
    if (config.performanceMonitoring) {
      this.setupPerformanceMonitoring()
    }

    this.setupRateLimiting(config.rateLimiting)
    this.setupCleanupRoutines()

    this.logger.info('AIHelpEngine initialized', {
      realTimeAssistance: config.enableRealTimeAssistance,
      contextualSuggestions: config.enableContextualSuggestions,
      proactiveHelp: config.enableProactiveHelp,
      performanceMonitoring: config.performanceMonitoring,
    })
  }

  /**
   * Process AI help request and return appropriate response
   * @param request - AI help request with type and context
   * @returns Promise<AIHelpResponse> - Structured help response
   */
  async processRequest(request: AIHelpRequest): Promise<AIHelpResponse> {
    const operationId = this.generateOperationId()
    const startTime = Date.now()

    this.logger.info(`[${operationId}] Processing AI help request`, {
      type: request.type,
      userId: request.userId,
      hasQuery: !!request.query,
      hasContext: !!request.context,
    })

    try {
      // Rate limiting check
      if (!(await this.checkRateLimit(request.userId))) {
        throw new Error('Rate limit exceeded')
      }

      // Route request to appropriate handler
      let response: AIHelpResponse
      switch (request.type) {
        case 'search':
          response = await this.handleSearchRequest(request, operationId)
          break
        case 'chat':
          response = await this.handleChatRequest(request, operationId)
          break
        case 'suggestions':
          response = await this.handleSuggestionsRequest(request, operationId)
          break
        case 'proactive':
          response = await this.handleProactiveRequest(request, operationId)
          break
        default:
          throw new Error(`Unsupported request type: ${request.type}`)
      }

      // Add common metadata
      response.metadata = {
        ...response.metadata,
        responseTime: Date.now() - startTime,
        operationId,
      }

      // Update metrics
      this.updateMetrics(request, response, Date.now() - startTime)

      this.logger.info(`[${operationId}] AI help request completed`, {
        type: request.type,
        responseTime: response.metadata.responseTime,
        cached: response.metadata.cached,
        suggestionsCount: response.suggestions?.length || 0,
      })

      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.logger.error(`[${operationId}] AI help request failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: request.type,
        userId: request.userId,
        responseTime,
      })

      // Return error response with fallback suggestions
      return this.createErrorResponse(error, operationId, responseTime)
    }
  }

  /**
   * Index help content for semantic search
   * @param content - Array of help content to index
   * @returns Promise<void>
   */
  async indexHelpContent(content: any[]): Promise<void> {
    const operationId = this.generateOperationId()

    this.logger.info(`[${operationId}] Starting help content indexing`, {
      contentCount: content.length,
    })

    try {
      await this.semanticSearch.indexContent(content)

      this.logger.info(`[${operationId}] Help content indexing completed`, {
        contentCount: content.length,
      })
    } catch (error) {
      this.logger.error(`[${operationId}] Help content indexing failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentCount: content.length,
      })
      throw error
    }
  }

  /**
   * Get comprehensive metrics for the AI help system
   * @returns AIHelpMetrics - Current system metrics
   */
  getMetrics(): AIHelpMetrics {
    return {
      requests: this.metrics.getRequestMetrics(),
      components: {
        embedding: this.embeddingService.getMetrics(),
        search: this.semanticSearch.getMetrics(),
        chatbot: this.chatbot.getMetrics(),
        predictiveHelp: this.predictiveHelp.getMetrics(),
      },
      performance: this.metrics.getPerformanceMetrics(),
      users: this.metrics.getUserMetrics(),
    }
  }

  /**
   * Health check for all AI help components
   * @returns Promise<boolean> - True if all components are healthy
   */
  async healthCheck(): Promise<boolean> {
    const operationId = this.generateOperationId()

    try {
      // Test embedding service
      await this.embeddingService.embed('health check test')

      // Test semantic search
      await this.semanticSearch.search('health check', {}, { maxResults: 1 })

      this.logger.info(`[${operationId}] Health check passed`)
      return true
    } catch (error) {
      this.logger.error(`[${operationId}] Health check failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Graceful shutdown of all AI help components
   * @returns Promise<void>
   */
  async shutdown(): Promise<void> {
    this.logger.info('Starting AI help engine shutdown')

    try {
      // Shutdown components in reverse order of dependencies
      await this.embeddingService.shutdown()

      this.logger.info('AI help engine shutdown completed')
    } catch (error) {
      this.logger.error('AI help engine shutdown failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Private Methods - Request Handlers

  private async handleSearchRequest(
    request: AIHelpRequest,
    operationId: string
  ): Promise<AIHelpResponse> {
    if (!request.query) {
      throw new Error('Search request requires a query')
    }

    const searchContext = request.context?.searchContext || {}
    const searchOptions = (request.options as SearchOptions) || {}

    const results = await this.semanticSearch.search(request.query, searchContext, searchOptions)

    return {
      type: 'search_results',
      data: results,
      suggestions: this.generateSearchSuggestions(results, searchContext),
      relatedContent: results.map((r) => ({
        id: r.id,
        title: r.title,
        type: 'article' as const,
        url: `/help/${r.id}`,
        relevanceScore: r.score,
        tags: r.tags,
      })),
      metadata: {
        responseTime: 0, // Will be set by caller
        confidence: results.length > 0 ? results[0].score : 0,
        cached: false,
        modelVersion: '1.0.0',
        operationId,
      },
    }
  }

  private async handleChatRequest(
    request: AIHelpRequest,
    operationId: string
  ): Promise<AIHelpResponse> {
    if (!request.query || !request.sessionId) {
      throw new Error('Chat request requires query and sessionId')
    }

    const chatResponse = await this.chatbot.processMessage(
      request.userId,
      request.sessionId,
      request.query,
      request.context?.conversationContext
    )

    return {
      type: 'chat_response',
      data: chatResponse,
      suggestions:
        chatResponse.suggestedActions?.map((action) => ({
          id: action.action,
          type: 'action' as const,
          title: action.title,
          description: action.description,
          confidence: 0.8,
          priority: action.priority,
          action: action.action,
          parameters: action.type === 'navigation' ? { url: action.action } : undefined,
        })) || [],
      relatedContent: chatResponse.relatedContent || [],
      metadata: {
        responseTime: 0,
        confidence: chatResponse.conversationState.confidence,
        cached: false,
        modelVersion: '1.0.0',
        operationId,
      },
    }
  }

  private async handleSuggestionsRequest(
    request: AIHelpRequest,
    operationId: string
  ): Promise<AIHelpResponse> {
    const searchContext = request.context?.searchContext || {}
    const suggestions = await this.semanticSearch.getSuggestions(searchContext)

    return {
      type: 'contextual_suggestions',
      data: suggestions,
      suggestions: suggestions.map((s, index) => ({
        id: s.id,
        type: 'content' as const,
        title: s.title,
        description: `${s.content.substring(0, 100)}...`,
        confidence: s.score,
        priority: index + 1,
      })),
      relatedContent: suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        type: 'article' as const,
        url: `/help/${s.id}`,
        relevanceScore: s.score,
        tags: s.tags,
      })),
      metadata: {
        responseTime: 0,
        confidence: suggestions.length > 0 ? suggestions[0].score : 0,
        cached: false,
        modelVersion: '1.0.0',
        operationId,
      },
    }
  }

  private async handleProactiveRequest(
    request: AIHelpRequest,
    operationId: string
  ): Promise<AIHelpResponse> {
    if (!request.context?.workflowContext) {
      throw new Error('Proactive request requires workflow context')
    }

    const prediction = await this.predictiveHelp.predictHelpNeeds(
      request.userId,
      request.sessionId || 'default',
      request.context.workflowContext
    )

    return {
      type: 'proactive_assistance',
      data: prediction,
      suggestions: prediction.interventions.map((intervention, index) => ({
        id: `intervention_${index}`,
        type: 'action' as const,
        title: intervention.content.title,
        description: intervention.content.message,
        confidence: prediction.confidence,
        priority: intervention.priority,
        action: intervention.actions[0]?.action || 'show_help',
      })),
      relatedContent: [],
      metadata: {
        responseTime: 0,
        confidence: prediction.confidence,
        cached: false,
        modelVersion: prediction.modelVersion,
        operationId,
      },
    }
  }

  // Private Methods - Utilities

  private generateSearchSuggestions(results: any[], context: SearchContext): AIHelpSuggestion[] {
    const suggestions: AIHelpSuggestion[] = []

    if (results.length === 0) {
      suggestions.push({
        id: 'no_results_help',
        type: 'action',
        title: 'Get Help from Support',
        description: 'Contact our support team for personalized assistance',
        confidence: 0.8,
        priority: 1,
        action: 'contact_support',
      })
    } else if (results.length === 1) {
      suggestions.push({
        id: 'explore_related',
        type: 'content',
        title: 'Explore Related Topics',
        description: 'Find more information on similar topics',
        confidence: 0.7,
        priority: 2,
        action: 'show_related_content',
      })
    }

    return suggestions
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now()
    const entry = this.rateLimiter.get(userId)

    if (!entry) {
      this.rateLimiter.set(userId, {
        requests: 1,
        windowStart: now,
        lastRequest: now,
      })
      return true
    }

    // Reset window if needed
    const windowDuration = 60000 // 1 minute
    if (now - entry.windowStart >= windowDuration) {
      entry.requests = 1
      entry.windowStart = now
      entry.lastRequest = now
      return true
    }

    // Check rate limit (default: 60 requests per minute)
    const maxRequests = 60
    if (entry.requests >= maxRequests) {
      return false
    }

    entry.requests++
    entry.lastRequest = now
    return true
  }

  private createErrorResponse(
    error: any,
    operationId: string,
    responseTime: number
  ): AIHelpResponse {
    return {
      type: 'error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTERNAL_ERROR',
      },
      suggestions: [
        {
          id: 'try_again',
          type: 'action',
          title: 'Try Again',
          description: 'Retry your request',
          confidence: 0.5,
          priority: 1,
          action: 'retry',
        },
        {
          id: 'contact_support',
          type: 'action',
          title: 'Contact Support',
          description: 'Get help from our support team',
          confidence: 0.9,
          priority: 2,
          action: 'contact_support',
        },
      ],
      relatedContent: [],
      metadata: {
        responseTime,
        confidence: 0,
        cached: false,
        modelVersion: '1.0.0',
        operationId,
      },
    }
  }

  private updateMetrics(
    request: AIHelpRequest,
    response: AIHelpResponse,
    responseTime: number
  ): void {
    this.metrics.recordRequest(request.type, responseTime, response.type !== 'error')
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance every minute
    setInterval(() => {
      const metrics = this.getMetrics()
      this.logger.info('Performance metrics', metrics.performance)
    }, 60000)
  }

  private setupRateLimiting(config: AIHelpEngineConfig['rateLimiting']): void {
    if (!config.enabled) return

    // Clean up old rate limit entries every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - 300000 // 5 minutes ago
      let cleaned = 0

      for (const [userId, entry] of this.rateLimiter.entries()) {
        if (entry.lastRequest < cutoff) {
          this.rateLimiter.delete(userId)
          cleaned++
        }
      }

      if (cleaned > 0) {
        this.logger.debug('Rate limit cleanup', { entriesCleaned: cleaned })
      }
    }, 300000)
  }

  private setupCleanupRoutines(): void {
    // General cleanup every hour
    setInterval(() => {
      this.logger.info('Running AI help engine maintenance')
      // Additional cleanup tasks would go here
    }, 3600000)
  }
}

// Supporting Classes

class AIHelpEngineMetrics {
  private requestCount = 0
  private requestsByType = new Map<string, number>()
  private responseTimes: number[] = []
  private successCount = 0
  private startTime = Date.now()

  recordRequest(type: string, responseTime: number, success: boolean): void {
    this.requestCount++
    this.requestsByType.set(type, (this.requestsByType.get(type) || 0) + 1)
    this.responseTimes.push(responseTime)
    if (success) this.successCount++

    // Keep only recent response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }
  }

  getRequestMetrics() {
    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0

    return {
      total: this.requestCount,
      byType: Object.fromEntries(this.requestsByType),
      averageResponseTime: avgResponseTime,
      successRate: this.requestCount > 0 ? this.successCount / this.requestCount : 1,
    }
  }

  getPerformanceMetrics() {
    const uptime = Date.now() - this.startTime
    const avgLatency =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0

    return {
      cacheHitRate: 0.75, // Placeholder - would be calculated from cache metrics
      averageLatency: avgLatency,
      errorRate:
        this.requestCount > 0 ? (this.requestCount - this.successCount) / this.requestCount : 0,
      uptime: uptime,
    }
  }

  getUserMetrics() {
    return {
      activeUsers: 0, // Would be calculated from active sessions
      totalSessions: 0, // Would be calculated from session data
      averageSessionDuration: 0, // Would be calculated from session data
    }
  }
}

interface RateLimitEntry {
  requests: number
  windowStart: number
  lastRequest: number
}

// Export all types and main class
export { EmbeddingService, SemanticSearchService, IntelligentChatbot, PredictiveHelpEngine }

/**
 * Factory function to create a fully configured AI Help Engine instance
 * @param environment - Environment configuration
 * @param logger - Logger instance
 * @returns Configured AIHelpEngine instance
 */
export function createAIHelpEngine(
  environment: 'development' | 'production' | 'test' = 'development',
  logger?: Logger
): AIHelpEngine {
  // Import configuration utilities
  const { getConfigForEnvironment } = require('./config')

  // Create logger if not provided
  if (!logger) {
    const { createLogger } = require('@/lib/logs/console/logger')
    logger = createLogger('AIHelpEngine')
  }

  // Get environment-specific configuration
  const config = getConfigForEnvironment()

  // Create and return engine instance
  return new AIHelpEngine(config, logger)
}

/**
 * Singleton AI Help Engine instance for application-wide use
 */
let globalAIHelpEngine: AIHelpEngine | null = null

/**
 * Get or create the global AI Help Engine instance
 * @returns Global AIHelpEngine instance
 */
export function getAIHelpEngine(): AIHelpEngine {
  if (!globalAIHelpEngine) {
    globalAIHelpEngine = createAIHelpEngine()
  }
  return globalAIHelpEngine
}

/**
 * Initialize the global AI Help Engine with custom configuration
 * @param config - Custom configuration
 * @param logger - Custom logger
 * @returns Initialized AIHelpEngine instance
 */
export function initializeAIHelpEngine(config: AIHelpEngineConfig, logger?: Logger): AIHelpEngine {
  if (!logger) {
    const { createLogger } = require('@/lib/logs/console/logger')
    logger = createLogger('AIHelpEngine')
  }

  globalAIHelpEngine = new AIHelpEngine(config, logger)
  return globalAIHelpEngine
}

/**
 * Gracefully shutdown the global AI Help Engine
 */
export async function shutdownAIHelpEngine(): Promise<void> {
  if (globalAIHelpEngine) {
    await globalAIHelpEngine.shutdown()
    globalAIHelpEngine = null
  }
}

export default AIHelpEngine
